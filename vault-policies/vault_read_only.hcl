# Normal servers have version 1 of KV mounted by default, so will need these
# paths:

path "secret/*" {
  capabilities = ["read"]
}

path "web/*" {
  capabilities = ["create", "update"]
}

path "crypto/*" {
  capabilities = ["read"]
}

path "database/*" {
   capabilities = ["read"]
}


path "sys/internal/ui/mounts/*" {
  capabilities = ["read"]
}
