path "secret/*" {
  capabilities = ["create"]
}


path "database/*" {
  capabilities = ["create"]
}

path "web/*" {
  capabilities = ["create", "update"]
}

path "crypto/*" {
  capabilities = ["read"]
}
