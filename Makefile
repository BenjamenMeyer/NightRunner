# NightRunner Backend Makefile

.PHONY: test test-all run migrate bruno-import

test:
	./venv/bin/pytest -q

test-all:
	./venv/bin/pytest -v

run:
	./venv/bin/uvicorn main:app --reload

migrate:
	python -m nightrunner_backend.app_context

bruno-import:
	mkdir -p api/bruno && bru import openapi --source api/openapi.yaml --output api/bruno --collection-name "NightRunner Backend"
