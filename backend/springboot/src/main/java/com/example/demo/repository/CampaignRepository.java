package com.example.demo.repository;

import com.example.demo.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    Optional<Campaign> findByCodeIgnoreCase(String code);
    List<Campaign> findBySellerId(Long sellerId);
    List<Campaign> findBySellerIdAndIsActiveTrue(Long sellerId);
    boolean existsByCodeIgnoreCase(String code);
}