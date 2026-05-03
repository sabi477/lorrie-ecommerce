package com.example.demo.controller;

import com.example.demo.entity.Order;
import com.example.demo.entity.OrderItem;
import com.example.demo.entity.Product;
import com.example.demo.entity.User;
import com.example.demo.repository.OrderItemRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @GetMapping
    public List<OrderResponse> getAll() {
        return orderRepository.findAllByOrderByIdDesc().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getById(@PathVariable Long id) {
        return orderRepository.findById(id)
                .map(order -> ResponseEntity.ok(toResponse(order)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/customer/{customerId}")
    public List<OrderResponse> getByCustomer(@PathVariable Long customerId) {
        return orderRepository.findByCustomer_IdOrderByIdDesc(customerId).stream().map(this::toResponse).toList();
    }

    @GetMapping("/seller/{sellerId}")
    public List<OrderResponse> getBySeller(@PathVariable Long sellerId) {
        return orderRepository.findBySellerIdOrderByIdDesc(sellerId).stream()
                .map(order -> toSellerResponse(order, sellerId)).toList();
    }

    @GetMapping("/{id}/seller/{sellerId}")
    public ResponseEntity<?> getOrderForSeller(@PathVariable Long id, @PathVariable Long sellerId) {
        System.out.println("[OrderController] getOrderForSeller called with id=" + id + ", sellerId=" + sellerId);
        try {
            return orderRepository.findById(id)
                    .map(order -> {
                        System.out.println("[OrderController] Order found: " + order.getId());
                        OrderResponse response = toSellerResponse(order, sellerId);
                        System.out.println("[OrderController] Response created successfully");
                        return ResponseEntity.ok(response);
                    })
                    .orElseGet(() -> {
                        System.out.println("[OrderController] Order not found for id: " + id);
                        return ResponseEntity.notFound().build();
                    });
        } catch (Exception e) {
            System.out.println("[OrderController] Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody CreateOrderRequest request) {
        if (request.customerId() == null) {
            return ResponseEntity.badRequest().body("customerId is required");
        }

        if (request.items() == null || request.items().isEmpty()) {
            return ResponseEntity.badRequest().body("Order must contain at least one item");
        }

        User customer = userRepository.findById(request.customerId())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(Order.OrderStatus.PENDING);
        order.setTotalAmount(request.totalAmount());

        Order savedOrder = orderRepository.save(order);

        for (CreateOrderItemRequest itemRequest : request.items()) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemRequest.productId()));

            OrderItem item = new OrderItem();
            item.setOrder(savedOrder);
            item.setProduct(product);
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(itemRequest.unitPrice());
            orderItemRepository.save(item);
        }

        return ResponseEntity.ok(toResponse(savedOrder));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(@PathVariable Long id,
            @RequestParam Order.OrderStatus status) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(status);
            Order savedOrder = orderRepository.save(order);
            return ResponseEntity.ok(toResponse(savedOrder));
        }).orElse(ResponseEntity.notFound().build());
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = orderItemRepository.findByOrder_Id(order.getId()).stream()
                .map(item -> {
                    Product product = item.getProduct();
                    return new OrderItemResponse(
                            product != null ? product.getId() : null,
                            product != null ? product.getName() : "Urun",
                            product != null ? product.getThumbnail() : null,
                            item.getQuantity(),
                            item.getUnitPrice());
                })
                .toList();

        BigDecimal subtotal = items.stream()
                .map(item -> item.price().multiply(BigDecimal.valueOf(item.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingCost = order.getTotalAmount() == null
                ? BigDecimal.ZERO
                : order.getTotalAmount().subtract(subtotal).max(BigDecimal.ZERO);

        User customer = order.getCustomer();
        return new OrderResponse(
                order.getId(),
                customer == null ? null : new CustomerResponse(customer.getId(), customer.getFullName(), customer.getEmail()),
                order.getStatus(),
                order.getTotalAmount(),
                order.getCreatedAt(),
                items,
                subtotal,
                shippingCost,
                new ShippingResponse(
                        customer == null ? "-" : customer.getFullName(),
                        "-",
                        "-",
                        "-",
                        "Hazirlaniyor",
                        "-"));
    }

    private OrderResponse toSellerResponse(Order order, Long sellerId) {
        System.out.println("[OrderController] toSellerResponse called for order " + order.getId() + " and seller " + sellerId);
        List<OrderItemResponse> items = orderItemRepository.findByOrderAndSeller(order.getId(), sellerId).stream()
                .filter(item -> item.getProduct() != null && item.getProduct().getSeller() != null)
                .map(item -> {
                    Product product = item.getProduct();
                    return new OrderItemResponse(
                            product.getId(),
                            product.getName(),
                            product.getThumbnail(),
                            item.getQuantity(),
                            item.getUnitPrice());
                })
                .toList();
        System.out.println("[OrderController] Found " + items.size() + " items for seller");

        BigDecimal subtotal = items.stream()
                .map(item -> item.price().multiply(BigDecimal.valueOf(item.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingCost = order.getTotalAmount() == null
                ? BigDecimal.ZERO
                : order.getTotalAmount().subtract(subtotal).max(BigDecimal.ZERO);

        User customer = order.getCustomer();
        return new OrderResponse(
                order.getId(),
                customer == null ? null : new CustomerResponse(customer.getId(), customer.getFullName(), customer.getEmail()),
                order.getStatus(),
                order.getTotalAmount(),
                order.getCreatedAt(),
                items,
                subtotal,
                shippingCost,
                new ShippingResponse(
                        customer == null ? "-" : customer.getFullName(),
                        "-",
                        "-",
                        "-",
                        "Hazirlaniyor",
                        "-"));
    }

    public record CreateOrderRequest(Long customerId, BigDecimal totalAmount, List<CreateOrderItemRequest> items) {
    }

    public record CreateOrderItemRequest(Long productId, Integer quantity, BigDecimal unitPrice) {
    }

    public record OrderResponse(
            Long id,
            CustomerResponse customer,
            Order.OrderStatus status,
            BigDecimal totalAmount,
            java.time.LocalDateTime createdAt,
            List<OrderItemResponse> items,
            BigDecimal subtotal,
            BigDecimal shippingCost,
            ShippingResponse shipping) {
    }

    public record CustomerResponse(Long id, String fullName, String email) {
    }

    public record OrderItemResponse(Long productId, String name, String thumbnail, Integer qty, BigDecimal price) {
    }

    public record ShippingResponse(String name, String address, String city, String zip, String carrier, String trackingNo) {
    }
}
