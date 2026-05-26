---
paths:
  [
    "**/requirements.txt",
    "**/pyproject.toml",
    "**/setup.py",
    "**/setup.cfg",
    "**/package.json",
    "**/pnpm-lock.yaml",
    "**/yarn.lock",
  ]
---

## 虚拟环境优先

- Python: 先查 `.venv` / `venv` / `conda env list`，存在就直接用
- Node: 先查 `node_modules`，存在就别重新 `npm install`
- 只有确定缺少依赖时才装，加 `--quiet`
