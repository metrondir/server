provider "google" {
  credentials = file("C:/Users/38096/AppData/Roaming/gcloud/application_default_credentials.json")
  project     = "angular-vuejs-23131"
  region      = "europe-west1"  # Replace with your desired region
}

resource "tls_private_key" "ssh_key" {
  count = 1

  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "google_compute_instance" "app_instance" {
  count        = 1
  name         = "app-instance-${count.index + 1}"
  machine_type = "e2-medium"
  zone         = "europe-west1-d"  # Replace with your desired zone

  metadata = {
    ssh-keys = "ubuntu:${tls_private_key.ssh_key[count.index].public_key_openssh}"
  }

  boot_disk {
    initialize_params {
      image = "ubuntu-2004-lts"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }
provisioner "file" {
    source      = "C:/Users/Public/Documents/server/.env"
    destination = "/home/ubuntu/.env"
  }
  provisioner "file" {
    source      = "C:/Users/Public/Documents/server/nginx"
    destination = "/home/ubuntu/"
  }
  
  connection {
      type        = "ssh"
      user        = "ubuntu"
      host        = google_compute_instance.app_instance[count.index].network_interface[0].access_config[0].nat_ip
      private_key = tls_private_key.ssh_key[count.index].private_key_pem
    }
  provisioner "remote-exec" {
    
    connection {
      type        = "ssh"
      user        = "ubuntu"
      host        = google_compute_instance.app_instance[count.index].network_interface[0].access_config[0].nat_ip
      private_key = tls_private_key.ssh_key[count.index].private_key_pem
    }
    inline = [
      "sudo apt-get update",
      "sudo apt install nginx -y",
      "git clone https://github.com/metrondir/server.git",
      "sudo cp /home/ubuntu/.env /home/ubuntu/server",
      "sudo cp /home/ubuntu/.env ~/server",
      "sudo apt-get install curl",
      "sudo apt-get upgrade -y",
     
      "sudo apt-get update",
      "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
      "sudo apt-get install -y  nodejs",
      "cd /home/ubuntu/server",
      "npm i ",
      "sudo rm -r /etc/nginx/nginx.conf",
      "sudo cp /home/ubuntu/nginx/nginx.conf /etc/nginx/nginx.conf",
      "sudo cp -r /home/ubuntu/nginx/letsencrypt /etc",
      "cd /home/ubuntu/server/",
      "sudo systemctl restart nginx",
      "sudo npm  install -g pm2",
      "pm2 start server.js",
    "echo Provisioning completed successfully!",
    ]
  }
  
}


resource "google_dns_record_set" "app_dns_record" {
  name          = "www.bezdna-vesna.lat."
  type          = "A"
  ttl           = 300

  managed_zone = "europe-west1-d"  # Use the existing DNS zone name
  rrdatas      = [google_compute_instance.app_instance[0].network_interface[0].access_config[0].nat_ip]
}

resource "google_dns_record_set" "app_dns_record_root" {
  name          = "bezdna-vesna.lat."
  type          = "A"
  ttl           = 300
  managed_zone  = "europe-west1-d"  # Use the existing DNS zone name
  rrdatas       = [google_compute_instance.app_instance[0].network_interface[0].access_config[0].nat_ip]
}

resource "google_compute_firewall" "app_instance_firewall" {
  name    = "app-firewall"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["3001"]
  }

  allow {
    protocol = "tcp"
    ports    = ["3002"]
  }

  allow {
    protocol = "tcp"
    ports    = ["3003"]
  }

  source_ranges = ["0.0.0.0/0"]
}


output "external_ip_address" {
  value = google_compute_instance.app_instance[0].network_interface[0].access_config[0].nat_ip
}