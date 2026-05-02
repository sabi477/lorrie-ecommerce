package com.example.demo.repository;

import com.example.demo.entity.SavedAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedAddressRepository extends JpaRepository<SavedAddress, Long> {
    List<SavedAddress> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);
    Optional<SavedAddress> findByUserIdAndIsDefaultTrue(Long userId);
    void deleteByIdAndUserId(Long id, Long userId);
}
