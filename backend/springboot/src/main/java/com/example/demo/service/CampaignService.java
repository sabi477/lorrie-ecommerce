package com.example.demo.service;

import com.example.demo.entity.Campaign;
import com.example.demo.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;

    public Optional<Campaign> findById(Long id) {
        return campaignRepository.findById(id);
    }

    public Optional<Campaign> findByCode(String code) {
        return campaignRepository.findByCodeIgnoreCase(code);
    }

    public List<Campaign> findBySellerId(Long sellerId) {
        return campaignRepository.findBySellerId(sellerId);
    }

    public Campaign save(Campaign campaign) {
        return campaignRepository.save(campaign);
    }

    public CampaignValidationResult validate(String code, BigDecimal orderSubtotal, Long userId, Long sellerId) {
        Optional<Campaign> opt = campaignRepository.findByCodeIgnoreCase(code);
        if (opt.isEmpty()) {
            return CampaignValidationResult.invalid("Kampanya kodu bulunamadı.");
        }

        Campaign campaign = opt.get();

        if (!campaign.getIsActive()) {
            return CampaignValidationResult.invalid("Bu kampanya artık aktif değil.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(campaign.getStartsAt())) {
            return CampaignValidationResult.invalid("Bu kampanya henüz başlamadı.");
        }
        if (now.isAfter(campaign.getExpiresAt())) {
            return CampaignValidationResult.invalid("Bu kampanya süresi dolmuş.");
        }

        if (campaign.getMaxUses() != null && campaign.getCurrentUses() >= campaign.getMaxUses()) {
            return CampaignValidationResult.invalid("Bu kampanya kullanım limitine ulaşmış.");
        }

        BigDecimal minAmount = campaign.getMinOrderAmount();
        if (minAmount != null && orderSubtotal.compareTo(minAmount) < 0) {
            return CampaignValidationResult.invalid("Minimum sipariş tutarı: $" + minAmount);
        }

        if (sellerId != null && campaign.getSeller() != null && !sellerId.equals(campaign.getSeller().getId())) {
            return CampaignValidationResult.invalid("Bu kampanya bu satıcıya ait değil.");
        }

        BigDecimal discount = calculateDiscount(campaign, orderSubtotal);
        return CampaignValidationResult.valid(campaign, discount);
    }

    public BigDecimal calculateDiscount(Campaign campaign, BigDecimal subtotal) {
        if (campaign.getDiscountType() == Campaign.DiscountType.PERCENTAGE) {
            return subtotal.multiply(campaign.getDiscountValue()).divide(BigDecimal.valueOf(100));
        } else {
            BigDecimal maxDiscount = campaign.getDiscountValue();
            return maxDiscount.compareTo(subtotal) > 0 ? subtotal : maxDiscount;
        }
    }

    public void incrementUsage(Campaign campaign) {
        campaign.setCurrentUses(campaign.getCurrentUses() + 1);
        campaignRepository.save(campaign);
    }

    public record CampaignValidationResult(boolean valid, String errorMessage, Campaign campaign, BigDecimal discountAmount) {
        public static CampaignValidationResult invalid(String error) {
            return new CampaignValidationResult(false, error, null, null);
        }
        public static CampaignValidationResult valid(Campaign campaign, BigDecimal discount) {
            return new CampaignValidationResult(true, null, campaign, discount);
        }
    }
}