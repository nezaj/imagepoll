MAKEFLAGS = --no-print-directory --always-make --silent
MAKE = make $(MAKEFLAGS)

dev:
	@echo "Spinning up local client..."
	yarn dev
