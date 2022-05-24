MAKEFLAGS = --no-print-directory --always-make --silent
MAKE = make $(MAKEFLAGS)

dev:
	@echo "Spinning up local client..."
	yarn dev

deploy:
	@echo "Deploying to production branch..."
	git push origin main:prod
