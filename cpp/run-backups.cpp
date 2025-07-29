#include <iostream>
#include <string>
#include <vector>
#include <format>
#include <memory>
#include <span>
#include <unistd.h>
#include <sys/wait.h>

struct BackupRunner {
private:
    std::vector<std::string> cmd_args = {
        "dotenvx", "run", "--", "node", "--no-deprecation",
        "--import", "./loader.mjs", "dist/index.js", "backup"
    };

    // Convert vector<string> to char* array for execvp
    std::vector<char*> to_char_array(const std::vector<std::string>& args) {
        std::vector<char*> result;
        result.reserve(args.size() + 1);
        
        for (const auto& arg : args) {
            result.push_back(const_cast<char*>(arg.c_str()));
        }
        result.push_back(nullptr); // execvp expects null-terminated array
        
        return result;
    }

public:
    int run() {
        try {
            std::cout << "Starting backup...\n";
            
            pid_t pid = fork();
            
            if (pid == 0) {
                // Child process
                auto char_args = to_char_array(cmd_args);
                execvp(cmd_args[0].c_str(), char_args.data());
                
                // If we reach here, execvp failed
                std::cerr << std::format("Failed to execute: {}\n", cmd_args[0]);
                return 1;
            } else if (pid > 0) {
                // Parent process
                int status;
                waitpid(pid, &status, 0);
                
                if (WIFEXITED(status)) {
                    int exit_code = WEXITSTATUS(status);
                    if (exit_code == 0) {
                        std::cout << "Backup completed successfully!\n";
                        return 0;
                    } else {
                        std::cerr << std::format("Backup failed with exit code: {}\n", exit_code);
                        return exit_code;
                    }
                } else {
                    std::cerr << "Backup process terminated abnormally\n";
                    return 1;
                }
            } else {
                std::cerr << "Failed to fork process\n";
                return 1;
            }
            
        } catch (const std::exception& e) {
            std::cerr << std::format("Error running backup: {}\n", e.what());
            return 1;
        } catch (...) {
            std::cerr << "Unknown error occurred\n";
            return 1;
        }
    }
};

int main(int argc, char* argv[]) {
    BackupRunner runner;
    return runner.run();
}
