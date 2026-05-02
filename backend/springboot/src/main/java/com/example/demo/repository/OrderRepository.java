package com.example.demo.repository;

import com.example.demo.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomer_IdOrderByIdDesc(Long customerId);
    List<Order> findAllByOrderByIdDesc();
    @Query("SELECT DISTINCT o FROM Order o JOIN OrderItem oi ON oi.order = o WHERE oi.product.seller.id = :sellerId ORDER BY o.id DESC")
    List<Order> findBySellerIdOrderByIdDesc(@Param("sellerId") Long sellerId);
}