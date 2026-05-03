package com.example.demo.repository;

import com.example.demo.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("SELECT p FROM Product p JOIN FETCH p.seller WHERE p.seller.id = :sellerId")
    List<Product> findBySellerId(Long sellerId);

    List<Product> findByCategoryId(Long categoryId);

    boolean existsByThumbnailIsNotNull();

    List<Product> findByNameContainingIgnoreCase(String name);

    @Query("SELECT p FROM Product p JOIN FETCH p.seller WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.seller.fullName) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Product> searchByNameOrSeller(String query);
}