const slotTime = '12:30:00';
const now = new Date(); // local
const [h, m, s] = slotTime.split(':').map(Number);
const target = new Date();
target.setHours(h, m, s, 0);
const cutoff = new Date(target.getTime() - 60 * 60 * 1000);
console.log(cutoff, now > cutoff);
