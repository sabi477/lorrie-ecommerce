package com.example.demo.controller;

import com.example.demo.entity.Campaign;
import com.example.demo.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<?> create(@RequestBody CreateCampaignRequest request) {
        if (request.code() == null || request.code().isBlank()) {
            return ResponseEntity.badRequest().body("Kod boş olamaz.");
        }
        if (campaignService.findByCode(request.code()).isPresent()) {
            return ResponseEntity.badRequest().body("Bu kod zaten kullanılıyor.");
        }
        if (request.discountType() == null) {
            return ResponseEntity.badRequest().body("İndirim türü seçilmeli.");
        }
        if (request.discountValue() == null || request.discountValue().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("İndirim tutarı 0'dan büyük olmalı.");
        }
        if (request.startsAt() == null || request.expiresAt() == null) {
            return ResponseEntity.badRequest().body("Başlangıç ve bitiş tarihi zorunludur.");
        }
        if (request.expiresAt().isBefore(request.startsAt())) {
            return ResponseEntity.badRequest().body("Bitiş tarihi başlangıçтан önce olamaz.");
        }

        Campaign campaign = new Campaign();
        campaign.setCode(request.code().toUpperCase());
        campaign.setDiscountType(request.discountType());
        campaign.setDiscountValue(request.discountValue());
        campaign.setMinOrderAmount(request.minOrderAmount() != null ? request.minOrderAmount() : BigDecimal.ZERO);
        campaign.setMaxUses(request.maxUses());
        campaign.setMaxUsesPerUser(request.maxUsesPerUser() != null ? request.maxUsesPerUser() : 1);
        campaign.setStartsAt(request.startsAt());
        campaign.setExpiresAt(request.expiresAt());
        campaign.setIsActive(true);
        campaign.setCreatedAt(LocalDateTime.now());

        Campaign saved = campaignService.findByCode(request.code()).orElse(null);
        return ResponseEntity.ok(toResponse(saved));
    }

    @GetMapping("/seller/{sellerId}")
    public List<CampaignResponse> getBySeller(@PathVariable Long sellerId) {
        return campaignService.findBySellerId(sellerId).stream().map(this::toResponse).toList();
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validate(@RequestParam String code,
                                     @RequestParam BigDecimal subtotal,
                                     @RequestParam Long userId,
                                     @RequestParam(required = false) Long sellerId) {
        CampaignService.CampaignValidationResult result = campaignService.validate(code, subtotal, userId, sellerId);
        if (!result.valid()) {
            return ResponseEntity.badRequest().body(new CampaignValidateResponse(false, result.errorMessage(), null, null));
        }
        return ResponseEntity.ok(new CampaignValidateResponse(true, null, result.campaign().getCode(), result.discountAmount()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpdateCampaignRequest request) {
        return campaignService.findById(id).map(campaign -> {
            if (request.code() != null && !request.code().equalsIgnoreCase(campaign.getCode())) {
                if (campaignService.findByCode(request.code()).isPresent()) {
                    return ResponseEntity.badRequest().body("Bu kod zaten kullanılıyor.");
                }
                campaign.setCode(request.code().toUpperCase());
            }
            if (request.discountType() != null) campaign.setDiscountType(request.discountType());
            if (request.discountValue() != null) campaign.setDiscountValue(request.discountValue());
            if (request.minOrderAmount() != null) campaign.setMinOrderAmount(request.minOrderAmount());
            if (request.maxUses() != null) campaign.setMaxUses(request.maxUses());
            if (request.maxUsesPerUser() != null) campaign.setMaxUsesPerUser(request.maxUsesPerUser());
            if (request.startsAt() != null) campaign.setStartsAt(request.startsAt());
            if (request.expiresAt() != null) campaign.setExpiresAt(request.expiresAt());
            if (request.isActive() != null) campaign.setIsActive(request.isActive());
            campaignService.save(campaign);
            return ResponseEntity.ok(toResponse(campaign));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return campaignService.findById(id).map(campaign -> {
            campaign.setIsActive(false);
            campaignService.save(campaign);
            return ResponseEntity.ok("Kampanya deaktif edildi.");
        }).orElse(ResponseEntity.notFound().build());
    }

    private CampaignResponse toResponse(Campaign c) {
        return new CampaignResponse(
                c.getId(),
                c.getCode(),
                c.getSeller() != null ? c.getSeller().getId() : null,
                c.getDiscountType(),
                c.getDiscountValue(),
                c.getMinOrderAmount(),
                c.getMaxUses(),
                c.getCurrentUses(),
                c.getMaxUsesPerUser(),
                c.getStartsAt(),
                c.getExpiresAt(),
                c.getIsActive(),
                c.getCreatedAt()
        );
    }

    public record CreateCampaignRequest(
            String code,
            Campaign.DiscountType discountType,
            BigDecimal discountValue,
            BigDecimal minOrderAmount,
            Integer maxUses,
            Integer maxUsesPerUser,
            LocalDateTime startsAt,
            LocalDateTime expiresAt
    ) {}

    public record UpdateCampaignRequest(
            String code,
            Campaign.DiscountType discountType,
            BigDecimal discountValue,
            BigDecimal minOrderAmount,
            Integer maxUses,
            Integer maxUsesPerUser,
            LocalDateTime startsAt,
            LocalDateTime expiresAt,
            Boolean isActive
    ) {}

    public record CampaignResponse(
            Long id,
            String code,
            Long sellerId,
            Campaign.DiscountType discountType,
            BigDecimal discountValue,
            BigDecimal minOrderAmount,
            Integer maxUses,
            Integer currentUses,
            Integer maxUsesPerUser,
            LocalDateTime startsAt,
            LocalDateTime expiresAt,
            Boolean isActive,
            LocalDateTime createdAt
    ) {}

    public record CampaignValidateResponse(boolean valid, String errorMessage, String code, BigDecimal discountAmount) {}
}