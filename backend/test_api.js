const run = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test API', email: `testapi_${Date.now()}@example.com`, password: 'password123' })
        });
        const data = await res.json();
        const token = data.token;
        console.log('Registered user');

        const profileRes = await fetch('http://localhost:5000/api/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ program: 'Computer Science', level: 100, curriculum_type: 'BMAS', current_cgpa: '0.0', academic_goal: 'Improve GPA' })
        });
        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(JSON.stringify(profileData));
        console.log('Profile Success:', !!profileData.id);

        const currRes = await fetch(`http://localhost:5000/api/courses/curriculum?program=Computer Science&level=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const currData = await currRes.json();
        if (!currRes.ok) throw new Error(JSON.stringify(currData));
        console.log('Curriculum Success, Courses Count:', currData.length);

    } catch (e) {
        console.error('API Error:', e.message);
    }
};
run();
