package com.example.demo.repository;

import com.example.demo.entity.SavedPaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedPaymentMethodRepository extends JpaRepository<SavedPaymentMethod, Long> {
    List<SavedPaymentMethod> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);
    Optional<SavedPaymentMethod> findByUserIdAndIsDefaultTrue(Long userId);
    void deleteByIdAndUserId(Long id, Long userId);
}
