# Spring Boot Backend — Reference

## 1. Starters you'll likely add (each needs a TechnicalSpec.md row)

| Need | Starter |
|------|---------|
| Bean Validation | `spring-boot-starter-validation` |
| Security | `spring-boot-starter-security` |
| Health/metrics | `spring-boot-starter-actuator` |
| Migrations | `spring-boot-starter-flyway` + `flyway-database-postgresql` |
| Cache | `spring-boot-starter-cache` + `com.github.ben-manes.caffeine:caffeine` |
| Durable module events | `spring-modulith-starter-jpa` |
| Retry | `spring-retry` + `spring-boot-starter-aspectj` |
| Containers in tests | `spring-boot-testcontainers` + `org.testcontainers:postgresql` |

## 2. Status-code map

| Situation | Status |
|-----------|--------|
| Created | 201 + `Location` |
| Read or update OK | 200 |
| Delete OK | 204 |
| Validation failed | 400 (field errors in `ProblemDetail`) |
| Not authenticated / not allowed | 401 / 403 |
| Not found (or not yours, to avoid leaking existence) | 404 |
| Unique key or optimistic-lock clash | 409 |
| Rate limited | 429 + `Retry-After` |
| Dependency down | 503 |

## 3. Example: a `@WebMvcTest`

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean UserApi userApi;

    @Test
    void missingUserIs404() throws Exception {
        when(userApi.findById(9L)).thenThrow(new UserNotFoundException(9L));
        mvc.perform(get("/users/9")).andExpect(status().isNotFound());
    }

    @Test
    void invalidEmailIs400() throws Exception {
        mvc.perform(post("/users").contentType(APPLICATION_JSON)
                .content("{\"name\":\"a\",\"email\":\"nope\"}"))
           .andExpect(status().isBadRequest());
    }
}
```

## 4. Example: an atomic guarded update

```java
@Modifying(clearAutomatically = true)
@Query("update Stock s set s.quantity = s.quantity - :n where s.id = :id and s.quantity >= :n")
int reserve(@Param("id") Long id, @Param("n") int n);

// service
if (stockRepository.reserve(id, n) == 0) throw new InsufficientStockException(id);
```

## 5. Example: a module event

```java
// user module (publisher), inside @Transactional create(...)
events.publishEvent(new UserRegistered(saved.getId()));

// notification module (consumer)
@Component
class WelcomeMailer {
    @ApplicationModuleListener
    void on(UserRegistered event) { /* idempotent: check if already sent */ }
}
```
`UserRegistered` is a public record in the `user` base package (it's part of the module's API).

## 6. Common Hibernate 7 / JPA pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Lazy collection in a loop | N+1 queries in `show-sql` | `@EntityGraph` / `join fetch` |
| `findAll()` on a big table | memory spike | `Pageable` |
| Entity returned from the controller | lazy-init exceptions, JSON cycles, leaked fields | DTO |
| `equals/hashCode` on a generated id | the same entity is unequal before and after persist | use a business key, or the id with a null-safe check |
| `ddl-auto=update` | the schema silently drifts; columns are never dropped | Flyway + `validate` |
