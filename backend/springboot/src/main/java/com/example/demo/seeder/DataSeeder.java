package com.example.demo.seeder;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String DUMMYJSON_URL = "https://dummyjson.com/products?limit=100";

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Mock data removal requested. Clearing database...");
        
        shipmentRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        reviewRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll(); // Remove all users including mock sellers/customers
        
        log.info("Database cleared. Automatic seeding is now DISABLED.");
    }

    private List<User> createSellers() {
        String[][] sellerData = {
            {"TechStore", "tech@lorrie.com"},
            {"FashionHub", "fashion@lorrie.com"},
            {"HomeDecor", "home@lorrie.com"},
            {"BeautyWorld", "beauty@lorrie.com"},
            {"SportZone", "sport@lorrie.com"},
        };

        List<User> sellers = new ArrayList<>();
        for (String[] data : sellerData) {
            User seller = userRepository.findByEmail(data[1]).orElseGet(() -> {
                User u = new User();
                u.setFullName(data[0]);
                u.setEmail(data[1]);
                u.setPassword(passwordEncoder.encode("seller123"));
                u.setRole(User.Role.SELLER);
                return userRepository.save(u);
            });
            sellers.add(seller);
        }
        return sellers;
    }

    private void seedProducts(List<User> sellers) {
        RestTemplate restTemplate = new RestTemplate();
        JsonNode root = restTemplate.getForObject(DUMMYJSON_URL, JsonNode.class);
        if (root == null || !root.has("products")) return;

        int sellerIdx = 0;
        for (JsonNode p : root.get("products")) {
            Category category = getOrCreateCategory(p.get("category").asText());
            User seller = sellers.get(sellerIdx++ % sellers.size());

            Product product = new Product();
            product.setName(p.get("title").asText());
            product.setDescription(p.get("description").asText());
            product.setPrice(BigDecimal.valueOf(p.get("price").asDouble()));
            product.setStockQuantity(p.get("stock").asInt());
            product.setCategory(category);
            product.setSeller(seller);

            if (p.has("thumbnail") && !p.get("thumbnail").isNull())
                product.setThumbnail(p.get("thumbnail").asText());
            if (p.has("thumbnail") && !p.get("thumbnail").isNull())
                product.setImageUrl(p.get("thumbnail").asText());
            if (p.has("brand") && !p.get("brand").isNull())
                product.setBrand(p.get("brand").asText());
            if (p.has("sku") && !p.get("sku").isNull())
                product.setSku(p.get("sku").asText());
            if (p.has("discountPercentage") && !p.get("discountPercentage").isNull())
                product.setDiscountPercentage(p.get("discountPercentage").asDouble());
            if (p.has("rating") && !p.get("rating").isNull())
                product.setAverageRating(p.get("rating").asDouble());

            if (p.has("tags")) {
                List<String> tags = new ArrayList<>();
                p.get("tags").forEach(t -> tags.add(t.asText()));
                product.setTags(tags);
            }

            Product saved = productRepository.save(product);
            seedReviews(p.get("reviews"), saved);
        }
    }

    private void seedReviews(JsonNode reviewsNode, Product product) {
        if (reviewsNode == null || !reviewsNode.isArray()) return;

        for (JsonNode r : reviewsNode) {
            String email = r.get("reviewerEmail").asText();
            String name = r.get("reviewerName").asText();

            User customer = userRepository.findByEmail(email).orElseGet(() -> {
                User u = new User();
                u.setEmail(email);
                u.setFullName(name);
                u.setPassword(passwordEncoder.encode("customer123"));
                u.setRole(User.Role.CUSTOMER);
                return userRepository.save(u);
            });

            Review review = new Review();
            review.setProduct(product);
            review.setCustomer(customer);
            review.setRating(r.get("rating").asInt());
            review.setComment(r.get("comment").asText());
            reviewRepository.save(review);
        }
    }

    private Category getOrCreateCategory(String slug) {
        String displayName = slugToDisplayName(slug);
        return categoryRepository.findByName(displayName).orElseGet(() -> {
            Category c = new Category();
            c.setName(displayName);
            c.setDescription(displayName + " products");
            return categoryRepository.save(c);
        });
    }

    private String slugToDisplayName(String slug) {
        return java.util.Arrays.stream(slug.split("-"))
            .map(w -> Character.toUpperCase(w.charAt(0)) + w.substring(1))
            .reduce((a, b) -> a + " " + b)
            .orElse(slug);
    }
}
