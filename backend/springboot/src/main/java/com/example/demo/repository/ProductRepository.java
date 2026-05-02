package com.example.demo.repository;

import com.example.demo.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findBySellerId(Long sellerId);

    List<Product> findByCategoryId(Long categoryId);

    boolean existsByThumbnailIsNotNull();

    List<Product> findByNameContainingIgnoreCase(String name);
}