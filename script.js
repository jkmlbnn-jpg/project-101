//signin
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function(event) {

        event.preventDefault();

        let email = document.getElementById("email").value;
        let password = document.getElementById("password").value;

        if (email === "" || password === "") {
            alert("Please complete all fields.");
        } else {
            alert("Login form submitted!");
        }

    });
}


//signup
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", function(event) {

        event.preventDefault();

        let name = document.getElementById("name").value;
        let email = document.getElementById("signupEmail").value;
        let password = document.getElementById("signupPassword").value;

        if (name === "" || email === "" || password === "") {
            alert("Please complete all fields.");
        } else {
            alert("Account form submitted!");
        }

    });
}
