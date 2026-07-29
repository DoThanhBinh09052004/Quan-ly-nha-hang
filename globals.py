from runtime.model_registry import ModelRegistry

# A single registry owns only persisted inference models. Routes must not train
# or replace these instances directly.
model_registry = ModelRegistry()
