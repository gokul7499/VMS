pipeline {
    agent any

    //tools {
    //    maven "Maven"
    //    jdk "Java-11"
    //}

    environment {
        //region = "us-east-1"
        aws_ecr_arn = "339713133121.dkr.ecr.${region}.amazonaws.com"
        task_def_arn = "arn:aws:ecs:${region}:339713133121:task-definition"
        cluster_arn = "arn:aws:ecs:${region}:339713133121:cluster"
        ROLE_ARN = 'arn:aws:iam::339713133121:role/jenkins-global-assume-role'
        ROLE_SESSION_NAME = 'jenkins-global-assume-role'
        PROFILE_NAME = 'assume-role-profile'
        module_name = "${module_name}"
        container_port = "${container_port}"
        host_port = "${container_port}"
    }

    stages {
        stage('Add Config files') {
            steps {
                configFileProvider([configFile(fileId: 'v4-common-config', replaceTokens: true, targetLocation: 'taskdef.json')]) {
                    // Configuration file provided
                }
            }
        }

        stage('Build Docker') {
            steps {
                script {
                    commit_id = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    sh "docker build --no-cache --pull . -t ${aws_ecr_arn}/${project_env}/${module_name}:build-v${BUILD_NUMBER}"
                }
            }
        }

        stage('Assume Role') {
            steps {
                script {
                    // Debugging: Capture output and errors
                    def assumeRoleOutput = sh(
                        script: """
                            aws sts assume-role \
                                --role-arn ${ROLE_ARN} \
                                --role-session-name ${ROLE_SESSION_NAME} \
                                --region ${region} \
                                --output json
                        """,
                        returnStdout: true
                    ).trim()

                    echo "Assume Role Output: ${assumeRoleOutput}"

                    //def json = readJSON text: assumeRoleOutput
                    //def accessKeyId = json.Credentials.AccessKeyId
                    //def secretAccessKey = json.Credentials.SecretAccessKey
                    //def sessionToken = json.Credentials.SessionToken

                    sh """                    
                    value=\$(aws sts assume-role \
                                --role-arn ${ROLE_ARN} \
                                --role-session-name ${ROLE_SESSION_NAME} \
                                --region ${region} \
                                --output json)
 
                    access_key_id=\$(echo "\$value" | jq -r '.Credentials.AccessKeyId')
                    secret_access_key=\$(echo \$value | jq -r '.Credentials.SecretAccessKey')
                    session_token=\$(echo \$value | jq -r '.Credentials.SessionToken')       
                    aws configure --profile assume-role-profile set aws_access_key_id \$access_key_id
                    aws configure --profile assume-role-profile set aws_secret_access_key \$secret_access_key
                    aws configure --profile assume-role-profile set aws_session_token \$session_token
                    aws configure --profile assume-role-profile set region ${region}
                    aws configure --profile assume-role-profile set output json
                    aws configure list-profiles
                    """
                    
                }
            }
        }

        stage('Docker Login and Push') {
            steps {
                sh "/usr/local/bin/aws ecr get-login-password --region ${region} --profile ${PROFILE_NAME} | docker login --username AWS --password-stdin ${aws_ecr_arn}"
                sh "docker push ${aws_ecr_arn}/${project_env}/${module_name}:build-v${BUILD_NUMBER}"
            }
        }

        stage('Deploy') {
            steps {
                sh "/usr/local/bin/aws ecs register-task-definition --family ${project_env}-${module_name}-task --cli-input-json file://taskdef.json --region ${region} --profile ${PROFILE_NAME}"
                sh "/usr/local/bin/aws --region ${region} ecs update-service --cluster ${cluster_arn}/${project_env}-v4-ecs --service ${project_env}-${module_name}-service --task-definition ${task_def_arn}/${project_env}-${module_name}-task --profile ${PROFILE_NAME} --propagate-tags TASK_DEFINITION"
            }
        }
    }

    post {
        always {
        sh """
                sed -i '/\\[${PROFILE_NAME}\\]/,+3d' ~/.aws/credentials
                sed -i '/\\[profile ${PROFILE_NAME}\\]/,+1d' ~/.aws/config
                rm -rf /var/lib/jenkins/.aws/config
            """
        }
        failure {
            emailext (
                to: 'devops@simplifyvms.com',
                subject: "Failed Pipeline: ${currentBuild.fullDisplayName}",
                body: "Something is wrong with ${env.BUILD_URL}",
                recipientProviders: [[$class: 'DevelopersRecipientProvider']]
            )
        }
    }
}
