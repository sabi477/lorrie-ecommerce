package com.example.demo.controller;

import com.example.demo.dto.CartItemResponse;
import com.example.demo.entity.CartItem;
import com.example.demo.entity.Product;
import com.example.demo.entity.User;
import com.example.demo.repository.CartItemRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<CartItemResponse>> getCart(Authentication authentication) {
        User user = currentUser(authentication);
        List<CartItemResponse> items = cartItemRepository.findByUser(user)
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(items);
    }

    @PostMapping("/{productId}")
    public ResponseEntity<CartItemResponse> addToCart(
            @PathVariable Long productId,
            Authentication authentication) {
        User user = currentUser(authentication);
        Product product = findProduct(productId);

        CartItem item = cartItemRepository.findByUserAndProduct(user, product)
                .orElseGet(() -> {
                    CartItem newItem = new CartItem();
                    newItem.setUser(user);
                    newItem.setProduct(product);
                    newItem.setQty(0);
                    return newItem;
                });

        item.setQty(item.getQty() + 1);
        cartItemRepository.save(item);
        return ResponseEntity.ok(toResponse(item));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<CartItemResponse> updateQty(
            @PathVariable Long productId,
            @RequestBody Map<String, Integer> body,
            Authentication authentication) {
        User user = currentUser(authentication);
        Product product = findProduct(productId);

        CartItem item = cartItemRepository.findByUserAndProduct(user, product)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not in cart"));

        int qty = body.getOrDefault("qty", 1);
        item.setQty(Math.max(1, qty));
        cartItemRepository.save(item);
        return ResponseEntity.ok(toResponse(item));
    }

    @DeleteMapping("/{productId}")
    @Transactional
    public ResponseEntity<Void> removeFromCart(
            @PathVariable Long productId,
            Authentication authentication) {
        User user = currentUser(authentication);
        Product product = findProduct(productId);
        cartItemRepository.deleteByUserAndProduct(user, product);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> clearCart(Authentication authentication) {
        User user = currentUser(authentication);
        cartItemRepository.deleteByUser(user);
        return ResponseEntity.noContent().build();
    }

    private CartItemResponse toResponse(CartItem item) {
        Product p = item.getProduct();
        CartItemResponse r = new CartItemResponse();
        r.setProductId(p.getId());
        r.setName(p.getName());
        r.setBrand(p.getBrand());
        r.setPrice(p.getPrice());

        if (p.getDiscountPercentage() != null && p.getDiscountPercentage() > 0) {
            BigDecimal multiplier = BigDecimal.valueOf(1 + p.getDiscountPercentage() / 100.0);
            r.setOriginalPrice(p.getPrice().multiply(multiplier));
        }

        r.setThumbnail(p.getThumbnail() != null ? p.getThumbnail() : p.getImageUrl());
        r.setImageUrl(p.getImageUrl());
        r.setQty(item.getQty());
        return r;
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }
}
