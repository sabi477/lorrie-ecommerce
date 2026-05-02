package com.example.demo.controller;

import com.example.demo.entity.Order;
import com.example.demo.entity.OrderItem;
import com.example.demo.repository.OrderItemRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seller")
@RequiredArgsConstructor
public class SellerController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;

    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<SellerDashboardStats> getDashboardStats(@RequestParam Long sellerId) {
        List<Order> sellerOrders = orderRepository.findBySellerIdOrderByIdDesc(sellerId);

        BigDecimal totalRevenue = sellerOrders.stream()
                .map(Order::getTotalAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalProducts = productRepository.findBySellerId(sellerId).size();

        Map<String, Long> statusCounts = new HashMap<>();
        for (Order order : sellerOrders) {
            String status = order.getStatus().name();
            statusCounts.put(status, statusCounts.getOrDefault(status, 0L) + 1);
        }

        long pendingCount = statusCounts.getOrDefault("PENDING", 0L);
        long completedCount = statusCounts.getOrDefault("DELIVERED", 0L) + statusCounts.getOrDefault("SHIPPED", 0L) + statusCounts.getOrDefault("CONFIRMED", 0L);

        return ResponseEntity.ok(new SellerDashboardStats(
                sellerOrders.size(),
                totalRevenue,
                totalProducts,
                pendingCount,
                completedCount,
                statusCounts
        ));
    }

    @GetMapping("/orders")
    @PreAuthorize("hasRole('SELLER')")
    public List<Order> getSellerOrders(@RequestParam Long sellerId) {
        return orderRepository.findBySellerIdOrderByIdDesc(sellerId);
    }

    public record SellerDashboardStats(
            long totalOrders,
            BigDecimal totalRevenue,
            long totalProducts,
            long pendingOrders,
            long completedOrders,
            Map<String, Long> orderStatusCounts
    ) {}
}