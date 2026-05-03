package com.example.demo.repository;

import com.example.demo.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrder_Id(Long orderId);
    List<OrderItem> findByOrderId(Long orderId);
    @Query("SELECT oi FROM OrderItem oi JOIN FETCH oi.product p LEFT JOIN FETCH p.seller WHERE oi.order.id = :orderId AND (p.seller IS NULL OR p.seller.id = :sellerId)")
    List<OrderItem> findByOrderAndSeller(@Param("orderId") Long orderId, @Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(oi) > 0 FROM OrderItem oi WHERE oi.order.customer.id = :customerId AND oi.product.id = :productId")
    boolean hasPurchasedProduct(@Param("customerId") Long customerId, @Param("productId") Long productId);
}