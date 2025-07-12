
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🏀 Seeding Rise as One Basketball Program database...')

    // Clear existing data
    await prisma.messageLog.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.paymentPlan.deleteMany()
    await prisma.template.deleteMany()
    await prisma.parent.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.systemSettings.deleteMany()
    await prisma.account.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()

    // Create admin user
    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash('johndoe123', 12)
    const adminUser = await prisma.user.create({
        data: {
            name: 'John Doe',
            email: 'john@doe.com',
            password: hashedPassword,
            role: 'admin',
        },
    })

    // Create system settings
    console.log('Creating system settings...')
    const systemSettings = [
        { key: 'program_name', value: 'Rise as One Yearly Program', description: 'Basketball program name' },
        { key: 'program_fee', value: '1565', description: 'Annual program fee in dollars' },
        { key: 'stripe_webhook_secret', value: '', description: 'Stripe webhook endpoint secret' },
        { key: 'email_from_address', value: 'admin@riseasone.com', description: 'Default from email address' },
        { key: 'sms_from_number', value: '+1-555-0123', description: 'Default SMS from number' },
        { key: 'reminder_days', value: '7,1', description: 'Days before due date to send reminders' },
        { key: 'late_fee_amount', value: '25', description: 'Late fee amount in dollars' },
        { key: 'grace_period_days', value: '3', description: 'Grace period before marking payment overdue' },
    ]

    for (const setting of systemSettings) {
        await prisma.systemSettings.create({ data: setting })
    }

    // Create sample parents with diverse profiles
    console.log('Creating sample parents...')
    const parentsData = [
        {
            name: 'Sarah Chen',
            email: 'sarah.chen@email.com',
            phone: '+1-555-0101',
            address: '123 Oak Street, Sunnydale, CA 94086',
            emergencyContact: 'Michael Chen (Husband)',
            emergencyPhone: '+1-555-0102',
            contractStatus: 'signed',
            status: 'active',
            image: 'https://img.freepik.com/premium-photo/elegant-asian-female-professional-captivating-headshot-with-black-short-hair-chic-dress-whit_983420-165955.jpg?w=2000'
        },
        {
            name: 'Marcus Johnson',
            email: 'marcus.johnson@email.com',
            phone: '+1-555-0201',
            address: '456 Pine Avenue, Richmond, CA 94801',
            emergencyContact: 'Lisa Johnson (Wife)',
            emergencyPhone: '+1-555-0202',
            contractStatus: 'signed',
            status: 'active',
            image: 'https://media.gettyimages.com/id/rbrb_1402/photo/studio-portrait-of-an-african-american-father-smiling-while-holding-his-young-daughter.jpg?s=1024x1024&w=gi&k=20&c=f7Up7WZb7MqpKu_9aD0fKgIdYjfmIqpkrUbQ6k3t8zU='
        },
        {
            name: 'Jennifer Williams',
            email: 'jennifer.williams@email.com',
            phone: '+1-555-0301',
            address: '789 Elm Drive, Berkeley, CA 94704',
            emergencyContact: 'David Williams (Husband)',
            emergencyPhone: '+1-555-0302',
            contractStatus: 'signed',
            status: 'active',
            image: 'https://pics.craiyon.com/2023-10-06/3af08672cb6f44ed9b84eac3ddced81d.webp'
        },
        {
            name: 'Carlos Rodriguez',
            email: 'carlos.rodriguez@email.com',
            phone: '+1-555-0401',
            address: '321 Maple Road, San Jose, CA 95126',
            emergencyContact: 'Maria Rodriguez (Wife)',
            emergencyPhone: '+1-555-0402',
            contractStatus: 'signed',
            status: 'active',
            image: 'https://img.freepik.com/premium-photo/headshot-close-up-portrait-indian-latin-confident-mature-good-looking-middle-age-leader-ceo-male-businessman-blur-office-background-handsome-hispanic-senior-business-man-smiling-camera_728202-3519.jpg'
        },
        {
            name: 'Priya Patel',
            email: 'priya.patel@email.com',
            phone: '+1-555-0501',
            address: '654 Cedar Lane, Fremont, CA 94536',
            emergencyContact: 'Raj Patel (Husband)',
            emergencyPhone: '+1-555-0502',
            contractStatus: 'pending',
            status: 'active',
            image: 'https://img.freepik.com/premium-photo/serene-south-asian-woman-portrait_1308-156746.jpg'
        },
        {
            name: 'Dorothy Wilson',
            email: 'dorothy.wilson@email.com',
            phone: '+1-555-0601',
            address: '987 Birch Street, Oakland, CA 94612',
            emergencyContact: 'Robert Wilson (Son)',
            emergencyPhone: '+1-555-0602',
            contractStatus: 'signed',
            status: 'active',
            image: 'https://i.pinimg.com/originals/51/15/45/511545c76a0ba7031751a1bfb3269943.jpg'
        },
        {
            name: 'James Thompson',
            email: 'james.thompson@email.com',
            phone: '+1-555-0701',
            address: '147 Spruce Avenue, Palo Alto, CA 94301',
            emergencyContact: 'Amanda Thompson (Wife)',
            emergencyPhone: '+1-555-0702',
            contractStatus: 'signed',
            status: 'active',
            image: 'https://img.freepik.com/premium-photo/capturing-essence-everyday-hyper-realistic-snapshot-middleaged-white-dad-embracing-m_1015980-15017.jpg'
        },
        {
            name: 'Michelle Davis',
            email: 'michelle.davis@email.com',
            phone: '+1-555-0801',
            address: '258 Willow Court, Mountain View, CA 94041',
            emergencyContact: 'Steven Davis (Husband)',
            emergencyPhone: '+1-555-0802',
            contractStatus: 'signed',
            status: 'active',
            image: 'https://i.pinimg.com/originals/cd/03/08/cd0308e1bc427bd05de5a3e06967e13f.jpg'
        },
        {
            name: 'Roberto Gonzalez',
            email: 'roberto.gonzalez@email.com',
            phone: '+1-555-0901',
            address: '369 Redwood Boulevard, Santa Clara, CA 95054',
            emergencyContact: 'Carmen Gonzalez (Wife)',
            emergencyPhone: '+1-555-0902',
            contractStatus: 'expired',
            status: 'inactive',
            image: 'https://media.gettyimages.com/id/805012064/photo/portrait-of-mature-hispanic-man.jpg?s=612x612&w=gi&k=20&c=NPQ0c_X2tt-RDkAZufIf1xpPK9hY4DMDO2Xf6ywtFvg='
        },
        {
            name: 'Amy Foster',
            email: 'amy.foster@email.com',
            phone: '+1-555-1001',
            address: '741 Ash Street, Cupertino, CA 95014',
            emergencyContact: 'John Foster (Husband)',
            emergencyPhone: '+1-555-1002',
            contractStatus: 'pending',
            status: 'active',
            image: 'https://img.freepik.com/premium-photo/professional-headshot-20-year-old-japanese-girl-business-attire-light-background_1057260-1102.jpg?w=2000'
        }
    ]

    const parents = []
    for (const parentData of parentsData) {
        const parent = await prisma.parent.create({
            data: {
                name: parentData.name,
                email: parentData.email,
                phone: parentData.phone,
                address: parentData.address,
                emergencyContact: parentData.emergencyContact,
                emergencyPhone: parentData.emergencyPhone,
                contractStatus: parentData.contractStatus,
                status: parentData.status,
                contractUploadedAt: parentData.contractStatus !== 'pending' ? new Date() : null,
                contractExpiresAt: parentData.contractStatus === 'signed' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
                notes: `Sample parent profile for ${parentData.name}`
            }
        })
        parents.push(parent)
    }

    // Create payment plans with different types
    console.log('Creating payment plans...')
    const paymentPlansData = [
        { parentIndex: 0, type: 'monthly', installments: 12 },
        { parentIndex: 1, type: 'monthly', installments: 12 },
        { parentIndex: 2, type: 'seasonal', installments: 4 },
        { parentIndex: 3, type: 'seasonal', installments: 4 },
        { parentIndex: 4, type: 'full', installments: 1 },
        { parentIndex: 5, type: 'monthly', installments: 12 },
        { parentIndex: 6, type: 'custom', installments: 6 },
        { parentIndex: 7, type: 'monthly', installments: 12 },
        { parentIndex: 8, type: 'seasonal', installments: 4, status: 'cancelled' },
        { parentIndex: 9, type: 'monthly', installments: 12 }
    ]

    const paymentPlans = []
    for (const planData of paymentPlansData) {
        const parent = parents[planData.parentIndex]
        const totalAmount = 1565
        const installmentAmount = totalAmount / planData.installments

        const paymentPlan = await prisma.paymentPlan.create({
            data: {
                parentId: parent.id,
                type: planData.type,
                totalAmount: totalAmount,
                installmentAmount: installmentAmount,
                installments: planData.installments,
                startDate: new Date('2024-01-01'),
                nextDueDate: planData.status === 'cancelled' ? null : new Date('2024-12-01'),
                status: planData.status || 'active',
                description: `${planData.type} payment plan for ${parent.name}`
            }
        })
        paymentPlans.push(paymentPlan)
    }

    // Create payment records
    console.log('Creating payment records...')
    for (let i = 0; i < paymentPlans.length; i++) {
        const plan = paymentPlans[i]
        const parent = parents[i]
        
        if (plan.status === 'cancelled') continue

        // Create payments based on plan type
        const numberOfPayments = plan.type === 'full' ? 1 : 
                                plan.type === 'seasonal' ? 4 :
                                plan.type === 'custom' ? 6 : 12

        for (let j = 0; j < numberOfPayments; j++) {
            const dueDate = new Date('2024-01-01')
            dueDate.setMonth(dueDate.getMonth() + j * (12 / numberOfPayments))

            const isPaid = j < numberOfPayments - 2 // Most payments are paid, some pending
            const isOverdue = j === numberOfPayments - 2 && Math.random() > 0.7 // Some overdue

            await prisma.payment.create({
                data: {
                    parentId: parent.id,
                    paymentPlanId: plan.id,
                    dueDate: dueDate,
                    amount: plan.installmentAmount,
                    status: isOverdue ? 'overdue' : isPaid ? 'paid' : 'pending',
                    paidAt: isPaid ? new Date(dueDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
                    remindersSent: isOverdue ? 2 : isPaid ? 0 : 1,
                    lastReminderSent: isOverdue ? new Date() : null
                }
            })
        }
    }

    // Create message templates
    console.log('Creating message templates...')
    const templates = [
        {
            name: 'Welcome to Rise as One',
            subject: 'Welcome to Rise as One Basketball Program!',
            body: 'Dear {parentName},\n\nWelcome to the Rise as One Basketball Program! We\'re excited to have {childName} join our basketball family.\n\nYour payment plan has been set up for ${amount} per {frequency}. You can view your payment schedule in your parent portal.\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\nRise as One Team',
            category: 'welcome',
            channel: 'email',
            variables: ['parentName', 'childName', 'amount', 'frequency']
        },
        {
            name: 'Payment Reminder - 7 Days',
            subject: 'Payment Reminder: ${amount} Due in 7 Days',
            body: 'Hi {parentName},\n\nThis is a friendly reminder that your payment of ${amount} is due on {dueDate}.\n\nYou can make your payment through our secure parent portal or contact us if you need assistance.\n\nThank you for your continued support!\n\nRise as One Team',
            category: 'reminder',
            channel: 'email',
            variables: ['parentName', 'amount', 'dueDate']
        },
        {
            name: 'Payment Reminder - 1 Day',
            subject: 'Payment Due Tomorrow: ${amount}',
            body: 'Dear {parentName},\n\nYour payment of ${amount} is due tomorrow ({dueDate}).\n\nPlease ensure your payment is submitted to avoid any late fees.\n\nPay now through your parent portal or contact us immediately if you need assistance.\n\nThank you,\nRise as One Team',
            category: 'reminder',
            channel: 'both',
            variables: ['parentName', 'amount', 'dueDate']
        },
        {
            name: 'Payment Overdue Notice',
            subject: 'Overdue Payment Notice - Action Required',
            body: 'Dear {parentName},\n\nYour payment of ${amount} was due on {dueDate} and is now overdue.\n\nPlease submit your payment immediately to avoid suspension from the program. A late fee of $25 may apply.\n\nContact us if you\'re experiencing financial difficulties - we\'re here to help.\n\nRise as One Administration',
            category: 'overdue',
            channel: 'both',
            variables: ['parentName', 'amount', 'dueDate']
        },
        {
            name: 'Payment Confirmation',
            subject: 'Payment Received - Thank You!',
            body: 'Hi {parentName},\n\nThank you! We\'ve received your payment of ${amount} on {paymentDate}.\n\nYour account is now up to date. Your next payment of ${nextAmount} is due on {nextDueDate}.\n\nAppreciate your prompt payment!\n\nRise as One Team',
            category: 'confirmation',
            channel: 'email',
            variables: ['parentName', 'amount', 'paymentDate', 'nextAmount', 'nextDueDate']
        },
        {
            name: 'Practice Reminder',
            subject: 'Practice This Week - {practiceDate}',
            body: 'Hi {parentName},\n\nReminder: {childName} has basketball practice this {dayOfWeek} at {practiceTime}.\n\nLocation: Main Gym\nPlease ensure {childName} brings:\n- Basketball shoes\n- Water bottle\n- Practice jersey\n\nSee you there!\nCoach Mike',
            category: 'general',
            channel: 'sms',
            variables: ['parentName', 'childName', 'practiceDate', 'dayOfWeek', 'practiceTime']
        },
        {
            name: 'Game Day Announcement',
            subject: 'Game Day: {teamName} vs {opponent}',
            body: 'Dear Rise as One families,\n\nGame day is here! {teamName} will be playing against {opponent}.\n\nGame Details:\nDate: {gameDate}\nTime: {gameTime}\nLocation: {gameLocation}\n\nCome cheer on our team! Let\'s rise as one!\n\nGo team!\nRise as One Coaching Staff',
            category: 'general',
            channel: 'email',
            variables: ['teamName', 'opponent', 'gameDate', 'gameTime', 'gameLocation']
        },
        {
            name: 'Contract Renewal Notice',
            subject: 'Contract Renewal Required',
            body: 'Dear {parentName},\n\nYour contract for the Rise as One Basketball Program expires on {expirationDate}.\n\nTo continue {childName}\'s participation in the program, please:\n1. Review the updated contract in your parent portal\n2. Sign and submit the renewal\n3. Update any payment plan preferences\n\nRenewal deadline: {renewalDeadline}\n\nContact us with any questions.\n\nRise as One Administration',
            category: 'contract',
            channel: 'email',
            variables: ['parentName', 'childName', 'expirationDate', 'renewalDeadline']
        }
    ]

    const createdTemplates = []
    for (const template of templates) {
        const createdTemplate = await prisma.template.create({
            data: {
                name: template.name,
                subject: template.subject,
                body: template.body,
                category: template.category,
                channel: template.channel,
                variables: template.variables,
                usageCount: Math.floor(Math.random() * 50) // Random usage count for demo
            }
        })
        createdTemplates.push(createdTemplate)
    }

    // Create sample message logs
    console.log('Creating message logs...')
    for (let i = 0; i < 50; i++) {
        const randomParent = parents[Math.floor(Math.random() * parents.length)]
        const randomTemplate = createdTemplates[Math.floor(Math.random() * createdTemplates.length)]
        const sentDate = new Date()
        sentDate.setDate(sentDate.getDate() - Math.floor(Math.random() * 30))

        await prisma.messageLog.create({
            data: {
                parentId: randomParent.id,
                templateId: randomTemplate.id,
                subject: randomTemplate.subject.replace('{parentName}', randomParent.name),
                body: randomTemplate.body.replace('{parentName}', randomParent.name),
                channel: randomTemplate.channel === 'both' ? (Math.random() > 0.5 ? 'email' : 'sms') : randomTemplate.channel,
                status: Math.random() > 0.1 ? 'delivered' : 'failed',
                sentAt: sentDate,
                deliveredAt: Math.random() > 0.1 ? new Date(sentDate.getTime() + 60000) : null
            }
        })
    }

    // Create audit logs
    console.log('Creating audit logs...')
    const auditActions = ['created', 'updated', 'deleted', 'payment_processed', 'message_sent', 'login']
    const entityTypes = ['parent', 'payment', 'payment_plan', 'template', 'user']

    for (let i = 0; i < 100; i++) {
        const logDate = new Date()
        logDate.setDate(logDate.getDate() - Math.floor(Math.random() * 60))

        await prisma.auditLog.create({
            data: {
                userId: Math.random() > 0.3 ? adminUser.id : null,
                action: auditActions[Math.floor(Math.random() * auditActions.length)],
                entityType: entityTypes[Math.floor(Math.random() * entityTypes.length)],
                entityId: parents[Math.floor(Math.random() * parents.length)].id,
                ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                createdAt: logDate
            }
        })
    }

    console.log('✅ Seeding completed successfully!')
    console.log(`Created:`)
    console.log(`- 1 admin user (john@doe.com / johndoe123)`)
    console.log(`- ${parents.length} sample parents`)
    console.log(`- ${paymentPlans.length} payment plans`)
    console.log(`- ${createdTemplates.length} message templates`)
    console.log(`- 50 message logs`)
    console.log(`- 100 audit logs`)
    console.log(`- 8 system settings`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
