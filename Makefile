# NightRunner Makefile

.PHONY: help test backend_test frontend_test terraform_test lint backend_lint frontend_lint terraform_lint fmt run migrate

help:
	@echo "NightRunner Developer Commands:"
	@echo "  make test           - Run all tests (backend, frontend, terraform)"
	@echo "  make backend_test   - Run Python backend unit tests"
	@echo "  make frontend_test  - Run Vitest frontend tests"
	@echo "  make terraform_test - Run OpenTofu/Terraform validation and formatting check"
	@echo "  make lint           - Run all linters (backend, frontend, terraform)"
	@echo "  make backend_lint   - Run backend check"
	@echo "  make frontend_lint  - Run oxlint linter on frontend"
	@echo "  make terraform_lint - Validate and check formatting for OpenTofu files"
	@echo "  make fmt            - Format OpenTofu files"
	@echo "  make run            - Run local uvicorn backend server"

test: backend_test frontend_test terraform_test

backend_test:
	./venv/bin/pytest -q

frontend_test:
	cd nightrunner_frontend && yarn test

terraform_test: terraform_lint

lint: backend_lint frontend_lint terraform_lint

backend_lint:
	./venv/bin/pytest --co -q > /dev/null

frontend_lint:
	cd nightrunner_frontend && yarn lint

terraform_lint:
	tofu -chdir=terraform fmt -check
	tofu -chdir=terraform validate

fmt:
	tofu -chdir=terraform fmt -recursive

run:
	./venv/bin/uvicorn nightrunner_backend.main:app --reload

migrate:
	python -m nightrunner_backend.app_context
