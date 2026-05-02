package com.example.demo.seeder;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import tools.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String DUMMYJSON_CATEGORY_URL = "https://dummyjson.com/products/category/%s?limit=100&skip=%d";
    private static final String DUMMYJSON_ALL_PRODUCTS_URL = "https://dummyjson.com/products?limit=100&skip=%d";

    // Seller name → category slugs they own
    private static final Map<String, String[]> SELLER_CATEGORIES = new LinkedHashMap<>();
    static {
        SELLER_CATEGORIES.put("SmartZone",     new String[]{"smartphones", "laptops", "tablets", "mobile-accessories", "automotive", "lighting"});
        SELLER_CATEGORIES.put("FashionWomen",  new String[]{"womens-dresses", "womens-bags", "womens-shoes", "womens-jewellery", "womens-watches", "tops"});
        SELLER_CATEGORIES.put("FashionMen",    new String[]{"mens-shirts", "mens-shoes", "mens-watches", "sunglasses"});
        SELLER_CATEGORIES.put("BeautyHub",     new String[]{"beauty", "fragrances", "skin-care"});
        SELLER_CATEGORIES.put("HomeStore",     new String[]{"furniture", "home-decoration", "kitchen-accessories", "bedding", "toilet"});
        SELLER_CATEGORIES.put("FreshMart",     new String[]{"groceries"});
        SELLER_CATEGORIES.put("SportsFuel",    new String[]{"sports-accessories"});
        SELLER_CATEGORIES.put("AutoHub",       new String[]{"motorcycle", "vehicle"});
    }

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Ensuring basic users exist...");
        createAdmin();
        createDemoUsers();
        seedSellersOnly(); // Make sure sellers exist

        if (productRepository.count() > 0) {
            if (productRepository.existsByThumbnailIsNotNull()) {
                log.info("DummyJSON data already seeded, skipping product seeding.");
                return;
            }
            log.info("Old products found (no thumbnails), clearing and re-seeding products...");
            shipmentRepository.deleteAll();
            orderItemRepository.deleteAll();
            orderRepository.deleteAll();
            reviewRepository.deleteAll();
            productRepository.deleteAll();
            categoryRepository.deleteAll();
        }

        log.info("Seeding database products from DummyJSON...");
        seedAllProducts();
        log.info("Seeding complete.");
    }

    private void seedSellersOnly() {
        for (Map.Entry<String, String[]> entry : SELLER_CATEGORIES.entrySet()) {
            String sellerName = entry.getKey();
            String sellerEmail = sellerName.toLowerCase() + "@lorrie.com";
            getOrCreateSeller(sellerName, sellerEmail);
        }
    }

    private void createAdmin() {
        Optional<User> existing = userRepository.findByEmail("admin@lorrie.com");
        if (existing.isEmpty()) {
            User admin = new User();
            admin.setFullName("Lorrie Admin");
            admin.setEmail("admin@lorrie.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(User.Role.ADMIN);
            userRepository.save(admin);
            log.info("Admin account created: admin@lorrie.com / admin123");
        } else {
            User admin = existing.get();
            if (!admin.getPassword().startsWith("$2a$")) {
                admin.setPassword(passwordEncoder.encode("admin123"));
                userRepository.save(admin);
                log.info("Admin password updated to encoded version.");
            }
        }
    }

    private void createDemoUsers() {
        Optional<User> existingCustomer = userRepository.findByEmail("ayse.yilmaz@demo.com");
        if (existingCustomer.isEmpty()) {
            User customer = new User();
            customer.setFullName("Ayşe Yılmaz");
            customer.setEmail("ayse.yilmaz@demo.com");
            customer.setPassword(passwordEncoder.encode("customer123"));
            customer.setRole(User.Role.CUSTOMER);
            userRepository.save(customer);
            log.info("Demo Customer created: ayse.yilmaz@demo.com / customer123");
        } else {
            User customer = existingCustomer.get();
            if (!customer.getPassword().startsWith("$2a$")) {
                customer.setPassword(passwordEncoder.encode("customer123"));
                userRepository.save(customer);
                log.info("Demo Customer password updated to encoded version.");
            }
        }

        Optional<User> existingSeller = userRepository.findByEmail("seller@lorrie.com");
        if (existingSeller.isEmpty()) {
            User seller = new User();
            seller.setFullName("Demo Satıcı");
            seller.setEmail("seller@lorrie.com");
            seller.setPassword(passwordEncoder.encode("seller123"));
            seller.setRole(User.Role.SELLER);
            userRepository.save(seller);
            log.info("Demo Seller created: seller@lorrie.com / seller123");
        } else {
            User seller = existingSeller.get();
            if (!seller.getPassword().startsWith("$2a$")) {
                seller.setPassword(passwordEncoder.encode("seller123"));
                userRepository.save(seller);
                log.info("Demo Seller password updated to encoded version.");
            }
        }
    }

    private void seedBySeller() {
        RestTemplate restTemplate = new RestTemplate();
        Random random = new Random(42); // fixed seed for reproducibility

        for (Map.Entry<String, String[]> entry : SELLER_CATEGORIES.entrySet()) {
            String sellerName = entry.getKey();
            String[] categorySlugs = entry.getValue();
            String sellerEmail = sellerName.toLowerCase() + "@lorrie.com";

            User seller = getOrCreateSeller(sellerName, sellerEmail);
            log.info("Seeding seller: {} ({})", sellerName, sellerEmail);

            // Collect all products from this seller's categories (3 pages = 300 max per category)
            List<JsonNode> allProducts = new ArrayList<>();
            for (String slug : categorySlugs) {
                for (int skip = 0; skip < 300; skip += 100) {
                    String url = String.format(DUMMYJSON_CATEGORY_URL, slug, skip);
                    JsonNode root = restTemplate.getForObject(url, JsonNode.class);
                    if (root == null || !root.has("products")) break;
                    int total = root.has("total") ? root.get("total").asInt() : 0;
                    if (skip >= total) break;
                    root.get("products").forEach(allProducts::add);
                }
            }

            // Shuffle for random distribution
            Collections.shuffle(allProducts, random);

            // Take up to 100 products (all available if fewer)
            int limit = Math.min(allProducts.size(), 100);
            List<JsonNode> selected = allProducts.subList(0, limit);

            int count = 0;
            for (JsonNode p : selected) {
                Category category = getOrCreateCategory(p.get("category").asText());
                Product product = buildProduct(p, category, seller);
                Product saved = productRepository.save(product);
                seedReviews(p.get("reviews"), saved);
                count++;
            }
            log.info("  → {} products saved for {}", count, sellerName);
        }
    }

    private void seedAllProducts() {
        RestTemplate restTemplate = new RestTemplate();
        Random random = new Random(42);

        List<User> sellers = new ArrayList<>();
        for (Map.Entry<String, String[]> entry : SELLER_CATEGORIES.entrySet()) {
            String sellerName = entry.getKey();
            String sellerEmail = sellerName.toLowerCase() + "@lorrie.com";
            sellers.add(getOrCreateSeller(sellerName, sellerEmail));
        }

        log.info("Collecting all products from DummyJSON...");
        List<JsonNode> allProducts = new ArrayList<>();
        for (int skip = 0; skip < 500; skip += 100) {
            String url = String.format(DUMMYJSON_ALL_PRODUCTS_URL, skip);
            JsonNode root = restTemplate.getForObject(url, JsonNode.class);
            if (root == null || !root.has("products")) break;
            int total = root.has("total") ? root.get("total").asInt() : 0;
            root.get("products").forEach(allProducts::add);
            if (allProducts.size() >= total || allProducts.size() >= 500) break;
        }
        log.info("Total products collected: {}", allProducts.size());

        Collections.shuffle(allProducts, random);

        int count = 0;
        for (JsonNode p : allProducts) {
            User seller = sellers.get(random.nextInt(sellers.size()));
            Category category = getOrCreateCategory(p.get("category").asText());
            Product product = buildProduct(p, category, seller);
            productRepository.save(product);
            count++;
        }
        log.info("  → {} products saved total", count);
    }

    private User getOrCreateSeller(String name, String email) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User seller = existing.get();
            if (!seller.getPassword().startsWith("$2a$")) {
                seller.setPassword(passwordEncoder.encode("seller123"));
                userRepository.save(seller);
                log.info("Seller {} password updated to encoded version.", name);
            }
            return seller;
        }
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode("seller123"));
        u.setRole(User.Role.SELLER);
        return userRepository.save(u);
    }

    private Product buildProduct(JsonNode p, Category category, User seller) {
        Product product = new Product();
        product.setName(p.get("title").asText());
        product.setDescription(p.get("description").asText());
        product.setPrice(BigDecimal.valueOf(p.get("price").asDouble()));
        product.setStockQuantity(p.get("stock").asInt());
        product.setCategory(category);
        product.setSeller(seller);

        if (p.has("thumbnail") && !p.get("thumbnail").isNull()) {
            product.setThumbnail(p.get("thumbnail").asText());
            product.setImageUrl(p.get("thumbnail").asText());
        }
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

        return product;
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
        return Arrays.stream(slug.split("-"))
            .map(w -> Character.toUpperCase(w.charAt(0)) + w.substring(1))
            .reduce((a, b) -> a + " " + b)
            .orElse(slug);
    }
}
