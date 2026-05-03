package com.example.demo.controller;

import com.example.demo.entity.Product;
import com.example.demo.entity.Review;
import com.example.demo.entity.User;
import com.example.demo.repository.OrderItemRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ReviewRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.InputSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;

    private String currentUserEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof String s && !s.equals("anonymousUser")) return s;
        return null;
    }

    @GetMapping("/product/{productId}")
    public List<Review> getByProduct(@PathVariable Long productId) {
        return reviewRepository.findByProductId(productId);
    }

    @GetMapping("/summary/{productId}")
    public ResponseEntity<Map<String, Object>> getAiSummary(@PathVariable Long productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);
        if (reviews.isEmpty()) {
            return ResponseEntity.ok(Map.of("summary", "Bu ürün için henüz değerlendirme bulunmuyor.", "reviewCount", 0));
        }

        double avgRating = reviews.stream().mapToInt(r -> r.getRating() != null ? r.getRating() : 0).average().orElse(0);
        long positiveCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() >= 4).count();
        long neutralCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() == 3).count();
        long negativeCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() <= 2).count();

        StringBuilder summary = new StringBuilder();
        summary.append(String.format("Bu ürün %.1f/5 ortalama puan almış (%d değerlendirme). ", avgRating, reviews.size()));
        summary.append(String.format("Müşteri görüşleri: %d olumlu, %d nötr, %d olumsuz. ", positiveCount, neutralCount, negativeCount));

        if (avgRating >= 4.5) {
            summary.append("Ürün çok beğenilmiş ve tavsiye ediliyor. ");
        } else if (avgRating >= 4.0) {
            summary.append("Genel olarak memnun kalınmış, kaliteli bir seçim olabilir. ");
        } else if (avgRating >= 3.0) {
            summary.append("Orta düzey bir ürün, beklentileri karşılayabilir. ");
        } else {
            summary.append("Düşük puanlı bir ürün, satın almadan önce dikkatli olunması tavsiye ediliyor. ");
        }

        return ResponseEntity.ok(Map.of(
            "summary", summary.toString(),
            "reviewCount", reviews.size(),
            "averageRating", Math.round(avgRating * 10.0) / 10.0,
            "positiveCount", positiveCount,
            "neutralCount", neutralCount,
            "negativeCount", negativeCount
        ));
    }

    @GetMapping("/customer/{customerId}")
    public List<Review> getByCustomer(@PathVariable Long customerId) {
        return reviewRepository.findByCustomerId(customerId);
    }

    @GetMapping("/can-review/{productId}")
    public ResponseEntity<Map<String, Object>> canReview(@PathVariable Long productId) {
        String email = currentUserEmail();
        if (email == null) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "NOT_LOGGED_IN"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "USER_NOT_FOUND"));
        }

        boolean hasPurchased = orderItemRepository.hasPurchasedProduct(user.getId(), productId);
        if (!hasPurchased) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "NOT_PURCHASED"));
        }

        boolean alreadyReviewed = reviewRepository.existsByCustomerIdAndProductId(user.getId(), productId);
        if (alreadyReviewed) {
            return ResponseEntity.ok(Map.of("canReview", false, "reason", "ALREADY_REVIEWED"));
        }

        return ResponseEntity.ok(Map.of("canReview", true, "reason", "OK"));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateReviewRequest request) {
        String email = currentUserEmail();
        if (email == null) {
            return ResponseEntity.status(401).body("Giriş yapmanız gerekiyor.");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body("Kullanıcı bulunamadı.");
        }

        Product product = productRepository.findById(request.productId()).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body("Ürün bulunamadı.");
        }

        boolean hasPurchased = orderItemRepository.hasPurchasedProduct(user.getId(), request.productId());
        if (!hasPurchased) {
            return ResponseEntity.status(403).body("Bu ürünü satın almadan yorum yapamazsınız.");
        }

        boolean alreadyReviewed = reviewRepository.existsByCustomerIdAndProductId(user.getId(), request.productId());
        if (alreadyReviewed) {
            return ResponseEntity.status(409).body("Bu ürüne zaten yorum yaptınız.");
        }

        // Puan doğrulama
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            return ResponseEntity.badRequest().body("Puan 1 ile 5 arasında olmalıdır.");
        }

        // Yorum metni sanitizasyonu
        String cleanComment = InputSanitizer.sanitize(request.comment());
        if (InputSanitizer.containsProfanity(request.comment(), 5, 1000)) {
            return ResponseEntity.badRequest().body("Yorumunuz uygunsuz içerik barındırdığı için kabul edilemez.");
        }
        if (!InputSanitizer.isValid(cleanComment, 5, 1000)) {
            return ResponseEntity.badRequest().body("Yorum en az 5, en fazla 1000 karakter olmalıdır. HTML, script veya kod içeremez.");
        }

        Review review = new Review();
        review.setCustomer(user);
        review.setProduct(product);
        review.setRating(request.rating());
        review.setComment(cleanComment);

        return ResponseEntity.ok(reviewRepository.save(review));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reviewRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    public record CreateReviewRequest(Long productId, Integer rating, String comment) {}
}
