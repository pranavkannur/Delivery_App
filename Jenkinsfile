pipeline {
    agent any

    environment {
        DOCKER_BUILDKIT = '1'
        DATABASE_URL = credentials('DATABASE_URL')
        JWT_SECRET = credentials('JWT_SECRET')
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo '📦 Cloning repository from GitHub...'
                checkout scm
            }
        }

        stage('Build Docker Containers') {
            steps {
                echo '🐳 Building Multi-Container Docker Stack...'
                sh 'docker compose build'
            }
        }

        stage('Setup Environment & Deploy') {
            steps {
                echo '🔐 Injecting secure production credentials...'
                sh '''
                    cat <<EOF > Backend/.env
PORT=5000
DATABASE_URL=postgres://avnadmin:AVNS_d7Nt00KD0ckOfRfHTBx@app-dy-kannurpranav67-f7e2.b.aivencloud.com:11978/defaultdb?sslmode=no-verify
JWT_SECRET=a_very_long_and_secure_secret_key_for_delivery_app
NODE_ENV=production
EOF
                '''
                echo '🚀 Deploying Production Containers...'
                sh 'docker compose down || true'
                sh 'docker compose up -d --remove-orphans --force-recreate'
            }
        }
    }

    post {
        success {
            echo '🎉 Jenkins CI/CD Pipeline Succeeded! Delivery App is LIVE.'
        }
        failure {
            echo '❌ Pipeline Failed! Check console output for logs.'
        }
    }
}