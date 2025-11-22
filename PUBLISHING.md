# Publishing Guide

## Pre-publish Checklist

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with new changes
3. **Run tests** (when available)
4. **Build the package**
5. **Test locally** with `npm link`
6. **Publish to npm**

## Steps to Publish

### 1. Build the Package

```bash
pnpm install
pnpm build
```

### 2. Test Locally

In this package directory:
```bash
npm link
```

In your test project:
```bash
npm link @cushin/api-codegen
```

Test the CLI:
```bash
npx @cushin/api-codegen init
npx @cushin/api-codegen generate
```

### 3. Publish to npm

First time setup:
```bash
npm login
```

For scoped packages, ensure your organization exists:
```bash
npm org ls @cushin
```

Publish:
```bash
# Dry run to see what will be published
npm publish --dry-run

# Publish for real
npm publish --access public
```

### 4. Verify Publication

```bash
# View package info
npm view @cushin/api-codegen

# Test installation
npm install @cushin/api-codegen
```

## Version Management

Follow Semantic Versioning:
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes

Update version:
```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Release Process

1. Create a new branch: `git checkout -b release/v1.x.x`
2. Update version: `npm version [patch|minor|major]`
3. Update CHANGELOG.md
4. Commit: `git commit -am "chore: release v1.x.x"`
5. Push: `git push origin release/v1.x.x`
6. Create PR and merge
7. Tag release: `git tag v1.x.x && git push --tags`
8. Publish: `npm publish --access public`

## Automation (Optional)

Consider using:
- **semantic-release**: Automated version management and changelog
- **GitHub Actions**: CI/CD for automated publishing
- **changeset**: Better version and changelog management

Example GitHub Action workflow:

```yaml
# .github/workflows/publish.yml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

### Package name already exists
- Choose a different name or use a scope: `@cushin-org/api-codegen`

### Permission denied
- Make sure you're logged in: `npm whoami`
- Check organization membership for scoped packages

### Files not included
- Check `.npmignore` and `package.json` `files` field
- Use `npm publish --dry-run` to preview

### Binary not executable
- Ensure `bin` field in `package.json` is correct
- Check shebang in CLI file: `#!/usr/bin/env node`
- Verify build output includes CLI file
