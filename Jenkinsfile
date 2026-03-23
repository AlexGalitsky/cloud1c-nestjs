pipeline {
    agent any

    tools {
        nodejs 'node24'
    }

    environment {
        HTTP_PROXY  = "http://192.168.1.204:44681"
        HTTPS_PROXY = "http://192.168.1.204:44681"
        // Добавляем IP сервера 1С сюда:
        NO_PROXY    = "localhost,127.0.0.1,192.168.1.202,.svc.cluster.local,.goodwin.website"

        REMOTE_USER = "администратор"
        REMOTE_HOST = "192.168.1.202"
        REMOTE_DIR  = "C:/apps/cloud1c-server"
    }

    stages {
        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Deploy') {
            steps {
                sshagent(credentials: ['windows-ssh-key']) {
                    withCredentials([file(credentialsId: 'cloud1c-server-env', variable: 'ENV_FILE')]) {
                        // 0. Флаги для автоматического принятия ключа сервера
                        def sshOpts = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
                        
                        // Тестовая команда
                        sh "ssh ${sshOpts} ${REMOTE_USER}@${REMOTE_HOST} 'hostname'"
                        
                        // 1. Останавливаем процесс, чтобы Windows разблокировала файлы
                        // Используем || true, чтобы пайплайн не упал, если процесс еще не создан
                        sh "ssh ${REMOTE_USER}@${REMOTE_HOST} 'pm2 stop cloud1c-server || true'"

                        // 2. Очищаем старый dist и копируем новые файлы
                        sh "ssh ${REMOTE_USER}@${REMOTE_HOST} 'rmdir /s /q ${REMOTE_DIR}\\dist || mkdir ${REMOTE_DIR}'"
                        sh "scp -r dist package.json package-lock.json ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"
                        
                        // 3. Кладем свежий .env из секретов Jenkins
                        sh "scp ${ENV_FILE} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/.env"

                        println "Installing dependencies on Windows..."
                        sh "ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd ${REMOTE_DIR} && npm install --production'"

                        // 4. Запускаем/Перезапускаем
                        sh "ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd ${REMOTE_DIR} && pm2 start dist/main.js --name cloud1c-server || pm2 restart cloud1c-server'"
                    }
                }
            }
        }

    }
}
