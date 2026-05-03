package com.example.demo.controller;

import com.example.demo.entity.Favorite;
import com.example.demo.entity.Product;
import com.example.demo.entity.User;
import com.example.demo.repository.FavoriteRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private static final Logger log = LoggerFactory.getLogger(FavoriteController.class);

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Product>> getMyFavorites(Authentication authentication) {
        User user = currentUser(authentication);
        List<Product> products = favoriteRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(Favorite::getProduct)
                .toList();
        return ResponseEntity.ok(products);
    }

    @PostMapping("/{productId}")
    public ResponseEntity<Product> addFavorite(@PathVariable Long productId, Authentication authentication) {
        log.info("addFavorite called: productId={}, auth={}", productId, authentication);
        User user = currentUser(authentication);
        log.info("addFavorite user: {}", user.getEmail());
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        favoriteRepository.findByUserAndProduct(user, product).orElseGet(() -> {
            Favorite favorite = new Favorite();
            favorite.setUser(user);
            favorite.setProduct(product);
            return favoriteRepository.save(favorite);
        });

        return ResponseEntity.ok(product);
    }

    @DeleteMapping("/{productId}")
    @Transactional
    public ResponseEntity<Void> removeFavorite(@PathVariable Long productId, Authentication authentication) {
        User user = currentUser(authentication);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        favoriteRepository.deleteByUserAndProduct(user, product);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{productId}/exists")
    public ResponseEntity<Boolean> isFavorite(@PathVariable Long productId, Authentication authentication) {
        User user = currentUser(authentication);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        return ResponseEntity.ok(favoriteRepository.existsByUserAndProduct(user, product));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
