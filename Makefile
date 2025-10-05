# Makefile for Budget App

.PHONY: help dev up down logs clean migrate seed restart rebuild

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Budget App - Available Commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

dev: ## Start development environment
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Development environment is running!$(NC)"
	@echo "$(GREEN)Frontend: http://localhost:5173$(NC)"
	@echo "$(GREEN)Backend:  http://localhost:3000$(NC)"

up: dev ## Alias for 'dev'

down: ## Stop all containers
	@echo "$(YELLOW)Stopping all containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Containers stopped$(NC)"

logs: ## Show logs from all containers
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show database logs
	docker-compose logs -f postgres

restart: ## Restart all containers
	@echo "$(YELLOW)Restarting containers...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Containers restarted$(NC)"

rebuild: ## Rebuild and restart all containers
	@echo "$(YELLOW)Rebuilding containers...$(NC)"
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "$(GREEN)✓ Containers rebuilt and started$(NC)"

clean: ## Stop containers and remove volumes
	@echo "$(YELLOW)Cleaning up...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

migrate: ## Run database migrations
	@echo "$(YELLOW)Running migrations...$(NC)"
	docker-compose exec backend npm run migrate
	@echo "$(GREEN)✓ Migrations complete$(NC)"

seed: ## Seed database with sample data
	@echo "$(YELLOW)Seeding database...$(NC)"
	docker-compose exec backend npm run seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-setup: migrate seed ## Run migrations and seed (full database setup)

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U budget_app_user -d budget_app

# Production commands
prod-build: ## Build production images
	docker-compose -f docker-compose.prod.yml build

prod-up: ## Start production environment
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production environment
	docker-compose -f docker-compose.prod.yml down

prod-logs: ## Show production logs
	docker-compose -f docker-compose.prod.yml logs -f

# Testing
test-backend: ## Run backend tests
	docker-compose exec backend npm test

# Status
status: ## Show container status
	docker-compose ps
