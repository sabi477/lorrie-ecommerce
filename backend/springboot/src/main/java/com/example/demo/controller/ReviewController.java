package com.example.demo.controller;

import com.example.demo.entity.Product;
import com.example.demo.entity.Review;
import com.example.demo.entity.User;
import com.example.demo.repository.OrderItemRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ReviewRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.InputSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;

    private String currentUserEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof String s && !s.equals("anonymousUser")) return s;
        return null;
    }

    @GetMapping("/product/{productId}")
    public List<Review> getByProduct(@PathVariable Long productId) {
        return reviewRepository.findByProductId(productId);
    }

    @GetMapping("/customer/{customerId}")
    public List<Review> getByCustomer(@PathVariable Long customerId) {
        return reviewRepository.findByCustomerId(customerId);
    }

    @GetMapping("/can-review/{productId}")
    public ResponseEntity<Map<String, Object>> canReview(@PathVariable Long productId) {
        String email = currentUserEmail();
        if (email == null) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "NOT_LOGGED_IN"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "USER_NOT_FOUND"));
        }

        boolean hasPurchased = orderItemRepository.hasPurchasedProduct(user.getId(), productId);
        if (!hasPurchased) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "NOT_PURCHASED"));
        }

        boolean alreadyReviewed = reviewRepository.existsByCustomerIdAndProductId(user.getId(), productId);
        if (alreadyReviewed) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "ALREADY_REVIEWED"));
        }

        return ResponseEntity.ok(Map.of("canReview", true, "reason", "OK"));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateReviewRequest request) {
        String email = currentUserEmail();
        if (email == null) {
            return ResponseEntity.status(401).body("Giriş yapmanız gerekiyor.");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body("Kullanıcı bulunamadı.");
        }

        Product product = productRepository.findById(request.productId()).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body("Ürün bulunamadı.");
        }

        boolean hasPurchased = orderItemRepository.hasPurchasedProduct(user.getId(), request.productId());
        if (!hasPurchased) {
            return ResponseEntity.status(403).body("Bu ürünü satın almadan yorum yapamazsınız.");
        }

        boolean alreadyReviewed = reviewRepository.existsByCustomerIdAndProductId(user.getId(), request.productId());
        if (alreadyReviewed) {
            return ResponseEntity.status(409).body("Bu ürüne zaten yorum yaptınız.");
        }

        // Puan doğrulama
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            return ResponseEntity.badRequest().body("Puan 1 ile 5 arasında olmalıdır.");
        }

        // Yorum metni sanitizasyonu
        String cleanComment = InputSanitizer.sanitize(request.comment());
        if (InputSanitizer.containsProfanity(request.comment(), 5, 1000)) {
            return ResponseEntity.badRequest().body("Yorumunuz uygunsuz içerik barındırdığı için kabul edilemez.");
        }
        if (!InputSanitizer.isValid(cleanComment, 5, 1000)) {
            return ResponseEntity.badRequest().body("Yorum en az 5, en fazla 1000 karakter olmalıdır. HTML, script veya kod içeremez.");
        }

        Review review = new Review();
        review.setCustomer(user);
        review.setProduct(product);
        review.setRating(request.rating());
        review.setComment(cleanComment);

        return ResponseEntity.ok(reviewRepository.save(review));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reviewRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    public record CreateReviewRequest(Long productId, Integer rating, String comment) {}
}
