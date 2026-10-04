---
name: spring-boot-backend
description: Conventions and patterns for writing and testing Java 21 / Spring Boot 4 / Spring Data JPA / Spring Modulith code — module layout, controllers, DTOs, validation, error handling, transactions, repositories, configuration, and the test-slice cookbook. Use when implementing, reviewing or testing any backend code.
---

# Spring Boot Backend (example stack skill)

Stack: **Java 21 · Spring Boot 4.1 · Spring Framework 7 · Hibernate 7 · Jackson 3 · Spring Modulith 2.1**.
More examples are in `REFERENCE.md`.

⚠️ **Version traps**
- Jackson 3 lives in `tools.jackson.*` (not `com.fasterxml.jackson.*`). The annotations stay in `com.fasterxml.jackson.annotation`.
- Use `@MockitoBean` in tests (`@MockBean` was removed).
- The web starter is `spring-boot-starter-webmvc` (Boot 4 naming).
- Jakarta namespaces only (`jakarta.persistence`, `jakarta.validation`).

---

## 1. Module layout

```
com.example.demo.<module>/
├── <Module>Api.java              public interface
├── <Module>Dto.java              public record (response)
├── Create<Module>Request.java    public record + validation (when needed by other modules; else internal)
├── <Module>NotFoundException.java public, if other modules must catch it
└── internal/
    ├── controller/<Module>Controller.java   package-private
    ├── service/<Module>Service.java         package-private, implements <Module>Api
    ├── repository/<Module>Repository.java   public interface (used across subpackages)
    └── entity/<Module>.java                 public @Entity, never leaves the module
```

## 2. Controller
```java
@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderApi orderApi;
    OrderController(OrderApi orderApi) { this.orderApi = orderApi; }

    @PostMapping
    ResponseEntity<OrderDto> create(@Valid @RequestBody CreateOrderRequest req, UriComponentsBuilder uri) {
        OrderDto created = orderApi.create(req);
        return ResponseEntity.created(uri.path("/orders/{id}").build(created.id())).body(created);
    }

    @GetMapping
    Page<OrderDto> list(@PageableDefault(size = 20) Pageable pageable) { return orderApi.list(pageable); }
}
```
Thin: no business logic, no repository access, no `@Transactional`.

## 3. DTOs & validation
```java
public record CreateOrderRequest(
        @NotNull Long userId,
        @NotBlank @Size(max = 255) String item,
        @Positive int quantity) {}
```
- Separate **request** records (no `id`, no server-owned fields) from **response** records.
- Needs `spring-boot-starter-validation`. Put `@Valid` on `@RequestBody`.

## 4. Errors → ProblemDetail
```java
@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound(OrderNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }
}
```
Set `spring.mvc.problemdetails.enabled=true` so framework errors (400/405/415) use the same
format. **Never** let a domain "not found" escape as a `RuntimeException` (500).

## 5. Service & transactions
- `@Service @Transactional` on the class; `@Transactional(readOnly = true)` on query methods.
- **Self-invocation bypasses the proxy:** `this.otherTxMethod()` does not start a new transaction.
- No HTTP, mail, or file I/O inside a transaction. Publish an event and handle it after commit.
- Map entity → DTO inside the service, while the session is still open.

## 6. Repository & JPA
- `interface OrderRepository extends JpaRepository<Order, Long>`
- Derived queries for simple filters; `@Query` (JPQL with `:params`) otherwise. **Never concatenate strings.**
- `@Modifying @Query("update …")` for atomic guarded updates; return `int` and check it.
- Relationships default to `LAZY`. Fetch with `@EntityGraph` or `join fetch` where needed (to avoid N+1).
- Only use relationships **within a module**. Across modules, store `Long otherId`.
- `spring.jpa.open-in-view=false` (should be set; Codebase.md §2).

## 7. Configuration
- `@ConfigurationProperties(prefix = "app.orders")` record + `@EnableConfigurationProperties`, rather than scattered `@Value`.
- Secrets: `${DB_PASSWORD}` from the environment. Profiles: `application-dev.properties`, `application-prod.properties`.

## 8. Testing cookbook

| Goal | Test |
|------|------|
| Service logic | `@ExtendWith(MockitoExtension.class)`, `@Mock OrderRepository`, then construct it directly, `new OrderService(repo)`, from a test in the same package (clearer than `@InjectMocks`) |
| HTTP status, validation, JSON | `@WebMvcTest(OrderController.class)` + `@MockitoBean OrderApi` + `MockMvc` (or `MockMvcTester`) |
| JPA queries / constraints | `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` against the worktree's DB |
| One module in isolation | `@ApplicationModuleTest` |
| Boundaries | `ModularityTests` (exists) |

The test class goes in the **same package** as the package-private class under test.

## 9. Logging
`private static final Logger log = LoggerFactory.getLogger(X.class);` Log **ids**, never names,
emails, or tokens. Use `info` for state changes and `warn` for handled anomalies.
