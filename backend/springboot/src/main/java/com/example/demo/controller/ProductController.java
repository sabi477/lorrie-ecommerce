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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;

    @GetMapping
    public List<Product> getAll(
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false, defaultValue = "0") Integer page,
            @RequestParam(value = "sellerId", required = false) Long sellerId,
            @RequestParam(value = "search", required = false) String search) {
        if (sellerId != null) {
            return productRepository.findBySellerId(sellerId);
        }
        if (search != null && !search.trim().isEmpty()) {
            return productRepository.findByNameContainingIgnoreCase(search.trim());
        }
        if (limit != null && limit > 0) {
            return productRepository.findAll(org.springframework.data.domain.PageRequest.of(page, limit)).getContent();
        }
        return productRepository.findAll();
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
        product.setId(id);
        return ResponseEntity.ok(productRepository.save(product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
