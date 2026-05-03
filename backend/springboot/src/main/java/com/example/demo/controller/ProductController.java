package com.example.demo.controller;

import com.example.demo.entity.Product;
import com.example.demo.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    public record BulkProductUpdateRequest(
            List<Long> ids,
            String name,
            String description,
            BigDecimal price,
            Integer stockQuantity,
            String imageUrl,
            String thumbnail,
            String brand,
            String sku,
            Double discountPercentage
    ) {}

    private final ProductRepository productRepository;

    @GetMapping
    public List<Product> getAll(
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false, defaultValue = "0") Integer page,
            @RequestParam(value = "sellerId", required = false) Long sellerId,
            @RequestParam(value = "search", required = false) String search) {
        List<Product> products;
        if (sellerId != null) {
            products = productRepository.findBySellerId(sellerId);
        } else if (search != null && !search.trim().isEmpty()) {
            products = productRepository.findByNameContainingIgnoreCase(search.trim());
        } else if (limit != null && limit > 0) {
            products = productRepository.findAll(org.springframework.data.domain.PageRequest.of(page, limit)).getContent();
        } else {
            products = productRepository.findAll();
        }
        return products.stream()
                .filter(p -> p.getStockQuantity() != null && p.getStockQuantity() > 0)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable Long id) {
        return productRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/visual-search")
    public ResponseEntity<?> visualSearch(@RequestParam("image") MultipartFile file) {
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(file.getBytes()));
            if (img == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Geçersiz görsel"));
            }

            int[] queryHistogram = computeColorHistogram(img);

            List<Product> allProducts = productRepository.findAll();
            List<Map<String, Object>> results = new ArrayList<>();

            for (Product p : allProducts) {
                if (p.getImageUrl() == null && p.getThumbnail() == null) continue;

                String imageUrl = p.getThumbnail() != null ? p.getThumbnail() : p.getImageUrl();
                try {
                    java.net.URL url = new java.net.URL(imageUrl);
                    BufferedImage productImg = ImageIO.read(url);
                    if (productImg != null) {
                        int[] productHistogram = computeColorHistogram(productImg);
                        double similarity = colorHistogramSimilarity(queryHistogram, productHistogram);
                        results.add(Map.of(
                                "product", p,
                                "similarity", similarity
                        ));
                    }
                } catch (Exception ignored) {}
            }

            results.sort((a, b) -> Double.compare((Double) b.get("similarity"), (Double) a.get("similarity")));

            List<Product> topResults = results.stream()
                    .limit(20)
                    .map(m -> (Product) m.get("product"))
                    .toList();

            return ResponseEntity.ok(topResults);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Görsel işlenemedi"));
        }
    }

    private int[] computeColorHistogram(BufferedImage img) {
        int[] histogram = new int[27];
        int w = img.getWidth();
        int h = img.getHeight();
        int samples = 0;

        int step = Math.max(1, (w * h) / 10000);

        for (int y = 0; y < h; y += step) {
            for (int x = 0; x < w; x += step) {
                Color c = new Color(img.getRGB(x, y), true);
                if (c.getAlpha() < 128) continue;

                int ri = c.getRed() / 32;
                int gi = c.getGreen() / 32;
                int bi = c.getBlue() / 32;
                histogram[ri * 9 + gi * 3 + bi]++;
                samples++;
            }
        }

        if (samples > 0) {
            for (int i = 0; i < histogram.length; i++) {
                histogram[i] = (int) (histogram[i] * 100.0 / samples);
            }
        }

        return histogram;
    }

    private double colorHistogramSimilarity(int[] a, int[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) {
            int min = Math.min(a[i], b[i]);
            int max = Math.max(a[i], b[i]);
            if (max > 0) {
                sum += (double) min / max;
            }
        }
        return sum / a.length;
    }

    @PostMapping
    public ResponseEntity<Product> create(@RequestBody Product product) {
        return ResponseEntity.ok(productRepository.save(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> update(@PathVariable Long id, @RequestBody Product product) {
        return productRepository.findById(id)
                .map(existing -> {
                    if (product.getName() != null && !product.getName().isEmpty()) existing.setName(product.getName());
                    if (product.getDescription() != null && !product.getDescription().isEmpty()) existing.setDescription(product.getDescription());
                    if (product.getPrice() != null) existing.setPrice(product.getPrice());
                    if (product.getStockQuantity() != null) existing.setStockQuantity(product.getStockQuantity());
                    if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) existing.setImageUrl(product.getImageUrl());
                    if (product.getThumbnail() != null && !product.getThumbnail().isEmpty()) existing.setThumbnail(product.getThumbnail());
                    if (product.getBrand() != null && !product.getBrand().isEmpty()) existing.setBrand(product.getBrand());
                    if (product.getSku() != null && !product.getSku().isEmpty()) existing.setSku(product.getSku());
                    if (product.getDiscountPercentage() != null) existing.setDiscountPercentage(product.getDiscountPercentage());
                    return ResponseEntity.ok(productRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/bulk")
    public ResponseEntity<List<Product>> bulkUpdate(@RequestBody BulkProductUpdateRequest request) {
        List<Product> updated = new ArrayList<>();
        for (Long id : request.ids) {
            productRepository.findById(id).ifPresent(product -> {
                if (request.name != null && !request.name.isEmpty()) product.setName(request.name);
                if (request.description != null) product.setDescription(request.description);
                if (request.price != null) product.setPrice(request.price);
                if (request.stockQuantity != null) product.setStockQuantity(request.stockQuantity);
                if (request.imageUrl != null) product.setImageUrl(request.imageUrl);
                if (request.thumbnail != null) product.setThumbnail(request.thumbnail);
                if (request.brand != null) product.setBrand(request.brand);
                if (request.sku != null) product.setSku(request.sku);
                if (request.discountPercentage != null) product.setDiscountPercentage(request.discountPercentage);
                updated.add(productRepository.save(product));
            });
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<Void> bulkDelete(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        if (ids != null) {
            productRepository.deleteAllById(ids);
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
