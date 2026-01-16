# Use Enforce Cargo Version Bumped

Check the incoming version in the Cargo.toml file of a Rust project in a Pull Request and enforce bumping version rules.

## Usage

### Inputs

| key | default | required | description |
|-----|---------|----------|-------------|
| github_token | n/a | true | The Github_Token used and required to make comments and review the cargo files on the project |


### Outputs

None

### Example Workflow

```yaml
on: pull_request

jobs:
  test-coverage:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Check if Cargo.toml has bumped version
        uses: AoXDev/cargo-version-bumped-checker@v1
        with:
          github_token: "${{ secrets.GITHUB_TOKEN }}"
      
```

## Contributing

All contributions are welcome, please open an issue or pull request.

To use this repository:
1. `npm i` 
2. `npm run build`
3. Good to make your changes!
