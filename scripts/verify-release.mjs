// Readiness inspection only: no deployments, payments or email sends.
const checks=[];const check=(name,passes)=>checks.push({name,passes:Boolean(passes)});
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!['localhost','127.0.0.1'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}};
check('Production HTTPS application origin',https(process.env.NEXT_PUBLIC_APP_URL));
check('Hosted HTTPS Supabase origin',https(process.env.NEXT_PUBLIC_SUPABASE_URL));
for(const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','RESEND_FROM_EMAIL','RESEND_WEBHOOK_SECRET','PAYSTACK_SECRET_KEY','NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY'])check(key,process.env[key]?.trim());
check('Private request-limit secret (32+ characters)',process.env.RATE_LIMIT_SECRET?.length>=32);
check('Authenticated worker secret (32+ characters)',process.env.CRON_SECRET?.length>=32);
check('Paystack public/private key modes match',Boolean(process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_live_')&&process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.startsWith('pk_live_')));
check('Verified production email sender format',/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.RESEND_FROM_EMAIL??''));
const exposed=Object.keys(process.env).filter(k=>k.startsWith('NEXT_PUBLIC_')&&/(SERVICE_ROLE|SECRET|RESEND_API|CRON)/.test(k));check('No private credentials in public variable names',exposed.length===0);
for(const item of checks)console.log(`${item.passes?'PASS':'MANUAL REQUIRED'} ${item.name}`);
console.log('Still requires recorded real checkout/webhook/email, production deployment, HTTPS/domain, monitoring and backup-restore evidence. Configuration presence alone does not prove production readiness.');
if(checks.some(c=>!c.passes))process.exitCode=1;
