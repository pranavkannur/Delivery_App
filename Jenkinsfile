pipeline {
    agent any

    environment {
        DOCKER_BUILDKIT = '1'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo '📦 Checking out repository from Git...'
                checkout scm
            }
        }

        stage('Build & Test Backend') {
            steps {
                echo '⚙️ Building Node.js Backend...'
                dir('Backend') {
                    sh 'npm ci'
                    sh 'npx prisma generate'
                    sh 'npm run build'
                }
            }
        }

        stage('Build & Test Frontend') {
            steps {
                echo '🎨 Building React Frontend with Vite & Tailwind...'
                dir('Frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker Containers with Docker Compose...'
                sh 'docker compose build'
            }
        }

        stage('Deploy Containers') {
            steps {
                echo '🚀 Deploying Application with Docker Compose...'
                sh 'docker compose up -d'
            }
        }
    }

    post {
        success {
            echo '🎉 CI/CD Pipeline Completed Successfully! Application is LIVE.'
        }
        failure {
            echo '❌ Pipeline Failed! Please check the build logs.'
        }
    }
}