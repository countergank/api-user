---
priority: P3
category: api
---

# Implement HATEOAS for self-describing REST APIs

**Do**: Include `_links` in API responses that provide URLs for related actions, enabling clients to discover available operations dynamically.
**Avoid**: Hardcoding URL patterns in client applications when the server can provide navigable links.
**Example**:
```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  const user = await this.usersService.findOne(id);
  return {
    ...user,
    _links: {
      self: { href: `/users/${id}` },
      orders: { href: `/users/${id}/orders` },
      update: { href: `/users/${id}`, method: 'PATCH' },
    },
  };
}
```
