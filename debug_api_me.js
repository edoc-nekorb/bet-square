import axios from 'axios';

async function debugMe() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'test@example.com',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log('Token obtained.');

        // 2. Get Me
        console.log('Fetching /auth/me...');
        const meRes = await axios.get('http://localhost:3000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('ME Response:', meRes.data);

    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}
debugMe();
