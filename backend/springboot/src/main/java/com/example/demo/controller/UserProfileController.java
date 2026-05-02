package com.example.demo.controller;

import com.example.demo.dto.SavedAddressRequest;
import com.example.demo.dto.SavedAddressResponse;
import com.example.demo.dto.SavedPaymentRequest;
import com.example.demo.dto.SavedPaymentResponse;
import com.example.demo.entity.SavedAddress;
import com.example.demo.entity.SavedPaymentMethod;
import com.example.demo.entity.User;
import com.example.demo.repository.SavedAddressRepository;
import com.example.demo.repository.SavedPaymentMethodRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserProfileController {

    private final SavedAddressRepository addressRepo;
    private final SavedPaymentMethodRepository paymentRepo;
    private final UserRepository userRepo;
    private final com.example.demo.repository.NotificationPreferencesRepository notifRepo;

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(Principal principal) {
        User user = findUser(principal);
        return notifRepo.findByUserId(user.getId())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(java.util.Map.of(
                        "orderUpdates", true,
                        "promotions", false,
                        "newArrivals", true,
                        "emailDigest", false
                )));
    }

    @PutMapping("/notifications")
    public ResponseEntity<?> saveNotifications(@RequestBody java.util.Map<String, Boolean> prefs, Principal principal) {
        User user = findUser(principal);
        com.example.demo.entity.NotificationPreferences np = notifRepo.findByUserId(user.getId())
                .orElse(new com.example.demo.entity.NotificationPreferences());
        np.setUser(user);
        np.setOrderUpdates(prefs.getOrDefault("orderUpdates", true));
        np.setPromotions(prefs.getOrDefault("promotions", false));
        np.setNewArrivals(prefs.getOrDefault("newArrivals", true));
        np.setEmailDigest(prefs.getOrDefault("emailDigest", false));
        notifRepo.save(np);
        return ResponseEntity.ok(np);
    }

    @PutMapping("/phone")
    public ResponseEntity<Void> updatePhone(@RequestBody java.util.Map<String, String> body, Principal principal) {
        User user = findUser(principal);
        user.setPhone(body.get("phone"));
        userRepo.save(user);
        return ResponseEntity.ok().build();
    }

    // ── Addresses ──────────────────────────────────────────────────

    @GetMapping("/addresses")
    public List<SavedAddressResponse> getAddresses(Principal principal) {
        User user = findUser(principal);
        return addressRepo.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId())
                .stream().map(this::toAddressResponse).toList();
    }

    @PostMapping("/addresses")
    public SavedAddressResponse addAddress(@RequestBody SavedAddressRequest req, Principal principal) {
        User user = findUser(principal);
        if (req.isDefault()) clearDefaultAddresses(user.getId());

        SavedAddress address = new SavedAddress();
        address.setUser(user);
        address.setTitle(req.getTitle());
        address.setFirstName(req.getFirstName());
        address.setLastName(req.getLastName());
        address.setAddress(req.getAddress());
        address.setCity(req.getCity());
        address.setZip(req.getZip());
        address.setDefault(req.isDefault());

        return toAddressResponse(addressRepo.save(address));
    }

    @PutMapping("/addresses/{id}")
    public SavedAddressResponse updateAddress(@PathVariable Long id, @RequestBody SavedAddressRequest req, Principal principal) {
        User user = findUser(principal);
        SavedAddress address = addressRepo.findById(id)
                .filter(a -> a.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Address not found"));

        if (req.isDefault()) clearDefaultAddresses(user.getId());

        address.setTitle(req.getTitle());
        address.setFirstName(req.getFirstName());
        address.setLastName(req.getLastName());
        address.setAddress(req.getAddress());
        address.setCity(req.getCity());
        address.setZip(req.getZip());
        address.setDefault(req.isDefault());

        return toAddressResponse(addressRepo.save(address));
    }

    @DeleteMapping("/addresses/{id}")
    public ResponseEntity<Void> deleteAddress(@PathVariable Long id, Principal principal) {
        User user = findUser(principal);
        addressRepo.deleteByIdAndUserId(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/addresses/{id}/default")
    public SavedAddressResponse setDefaultAddress(@PathVariable Long id, Principal principal) {
        User user = findUser(principal);
        clearDefaultAddresses(user.getId());
        SavedAddress address = addressRepo.findById(id)
                .filter(a -> a.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Address not found"));
        address.setDefault(true);
        return toAddressResponse(addressRepo.save(address));
    }

    // ── Payment Methods ────────────────────────────────────────────

    @GetMapping("/payment-methods")
    public List<SavedPaymentResponse> getPaymentMethods(Principal principal) {
        User user = findUser(principal);
        return paymentRepo.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId())
                .stream().map(this::toPaymentResponse).toList();
    }

    @PostMapping("/payment-methods")
    public SavedPaymentResponse addPaymentMethod(@RequestBody SavedPaymentRequest req, Principal principal) {
        User user = findUser(principal);
        if (req.isDefault()) clearDefaultPayments(user.getId());

        String raw = req.getCardNumber().replaceAll("\\D", "");
        String lastFour = raw.length() >= 4 ? raw.substring(raw.length() - 4) : raw;
        String brand = detectBrand(raw);

        SavedPaymentMethod pm = new SavedPaymentMethod();
        pm.setUser(user);
        pm.setCardHolderName(req.getCardHolderName());
        pm.setLastFour(lastFour);
        pm.setBrand(brand);
        pm.setExpiry(req.getExpiry());
        pm.setDefault(req.isDefault());

        return toPaymentResponse(paymentRepo.save(pm));
    }

    @DeleteMapping("/payment-methods/{id}")
    public ResponseEntity<Void> deletePaymentMethod(@PathVariable Long id, Principal principal) {
        User user = findUser(principal);
        paymentRepo.deleteByIdAndUserId(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/payment-methods/{id}")
    public SavedPaymentResponse updatePaymentMethod(@PathVariable Long id, @RequestBody SavedPaymentRequest req, Principal principal) {
        User user = findUser(principal);
        SavedPaymentMethod pm = paymentRepo.findById(id)
                .filter(p -> p.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Payment method not found"));

        if (req.isDefault()) clearDefaultPayments(user.getId());

        pm.setCardHolderName(req.getCardHolderName());
        pm.setExpiry(req.getExpiry());
        pm.setDefault(req.isDefault());

        return toPaymentResponse(paymentRepo.save(pm));
    }

    @PutMapping("/payment-methods/{id}/default")
    public SavedPaymentResponse setDefaultPayment(@PathVariable Long id, Principal principal) {
        User user = findUser(principal);
        clearDefaultPayments(user.getId());
        SavedPaymentMethod pm = paymentRepo.findById(id)
                .filter(p -> p.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Payment method not found"));
        pm.setDefault(true);
        return toPaymentResponse(paymentRepo.save(pm));
    }

    // ── Helpers ────────────────────────────────────────────────────

    private User findUser(Principal principal) {
        return userRepo.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void clearDefaultAddresses(Long userId) {
        addressRepo.findByUserIdAndIsDefaultTrue(userId).ifPresent(a -> {
            a.setDefault(false);
            addressRepo.save(a);
        });
    }

    private void clearDefaultPayments(Long userId) {
        paymentRepo.findByUserIdAndIsDefaultTrue(userId).ifPresent(p -> {
            p.setDefault(false);
            paymentRepo.save(p);
        });
    }

    private String detectBrand(String number) {
        if (number.startsWith("4")) return "VISA";
        if (number.startsWith("5") || number.startsWith("2")) return "MASTERCARD";
        if (number.startsWith("3")) return "AMEX";
        return "CARD";
    }

    private SavedAddressResponse toAddressResponse(SavedAddress a) {
        SavedAddressResponse r = new SavedAddressResponse();
        r.setId(a.getId());
        r.setTitle(a.getTitle());
        r.setFirstName(a.getFirstName());
        r.setLastName(a.getLastName());
        r.setAddress(a.getAddress());
        r.setCity(a.getCity());
        r.setZip(a.getZip());
        r.setDefault(a.isDefault());
        return r;
    }

    private SavedPaymentResponse toPaymentResponse(SavedPaymentMethod p) {
        SavedPaymentResponse r = new SavedPaymentResponse();
        r.setId(p.getId());
        r.setCardHolderName(p.getCardHolderName());
        r.setLastFour(p.getLastFour());
        r.setBrand(p.getBrand());
        r.setExpiry(p.getExpiry());
        r.setDefault(p.isDefault());
        return r;
    }
}
