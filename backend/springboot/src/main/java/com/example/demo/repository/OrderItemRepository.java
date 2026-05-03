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

    @Query(value = "SELECT p.seller_id as sellerId, u.full_name as sellerName, SUM(oi.unit_price * oi.quantity) as totalRevenue, COUNT(DISTINCT o.id) as totalOrders " +
            "FROM order_items oi " +
            "JOIN products p ON oi.product_id = p.id " +
            "JOIN orders o ON oi.order_id = o.id " +
            "JOIN users u ON p.seller_id = u.id " +
            "WHERE o.status NOT IN ('CANCELLED') " +
            "GROUP BY p.seller_id, u.full_name " +
            "ORDER BY totalRevenue DESC " +
            "LIMIT :limit", nativeQuery = true)
    List<Object[]> findTopSellersByRevenue(@Param("limit") int limit);
}