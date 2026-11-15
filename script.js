
// SIGN UP
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("signupEmail").value.trim().toLowerCase();
        const password = document.getElementById("signupPassword").value;

        if (!name || !email || !password) {
            alert("Please complete all fields.");
            return;
        }

        let users = JSON.parse(localStorage.getItem("equipTrackUsers")) || [];

        const existingUser = users.find(function(user) {
            return user.email === email;
        });

        if (existingUser) {
            alert("This email is already registered.");
            return;
        }

        const newUser = {
            name: name,
            email: email,
            password: password
        };

        users.push(newUser);

        localStorage.setItem("equipTrackUsers", JSON.stringify(users));

        alert("Account created successfully!");

        signupForm.reset();
        window.location.href = "index.html";
    });
}


// LOGIN
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            alert("Please complete all fields.");
            return;
        }

        let users = JSON.parse(localStorage.getItem("equipTrackUsers")) || [];

        const matchedUser = users.find(function(user) {
            return user.email === email && user.password === password;
        });

        if (matchedUser) {
            localStorage.setItem("equipTrackCurrentUser", JSON.stringify({
                name: matchedUser.name,
                email: matchedUser.email
            }));

            alert("Login successful! Welcome, " + matchedUser.name + "!");

            window.location.href = "home.html";
        } else {
            alert("Incorrect email or password. Please try again.");
        }
    });
}
