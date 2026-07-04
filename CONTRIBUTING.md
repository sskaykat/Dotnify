# Contributing to Dotnify

Thanks for your interest in contributing! Before you start, please read this guide carefully.

## Reporting Issues

- Search existing issues before creating a new one
- Use the provided issue templates
- Include as much detail as possible (browser, deployment method, logs, steps to reproduce)

## Pull Requests

1. Fork the repository
2. Create a feature branch from `main`: `git checkout -b feat/my-feature`
3. Make your changes
4. Run type check and build to make sure nothing is broken:
   ```bash
   npm run typecheck
   npm run build
   ```
5. Commit with a clear message (follow [Conventional Commits](https://www.conventionalcommits.org/)):
   - `feat: add support for XXX`
   - `fix: resolve issue with XXX`
   - `docs: update XXX`
   - `i18n: add translation for XXX`
6. Open a pull request against the `main` branch

## Code Style

- TypeScript everywhere — no `any` unless absolutely necessary
- Follow the existing patterns in the codebase
- Keep components small and focused
- Use i18n keys for all user-facing text (see `src/lib/i18n.tsx`)

## Internationalization

When adding or modifying user-facing text:

1. Add the key to **both** `en` and `zh-CN` sections in `src/lib/i18n.tsx`
2. Use the `t()` function in components: `t("my.new.key")`
3. For text with variables: `t("key", { count: 5 })`

## Questions?

Feel free to open an issue with the "question" label.
