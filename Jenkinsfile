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
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
EOF
                '''
                echo '🚀 Deploying Production Containers with Docker Compose...'
                sh 'docker rm -f $(docker ps -aq --filter "publish=5000" --filter "publish=80") || true'
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