# Normal servers have version 1 of KV mounted by default, so will need these
# paths:

path "secret/*" {
  capabilities = ["read", "update", "delete", "list"]
}

path "web/*" {
  capabilities = ["read", "update", "delete", "list"]
}

path "crypto/*" {
  capabilities = ["read", "update", "delete", "list"]
}

path "database/*" {
  capabilities = ["read", "update", "delete", "list"]
}

path "sys/internal/ui/mounts/*" {
  capabilities = ["read"]
}
