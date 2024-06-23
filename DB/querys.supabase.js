const supabase = require("./supabase");

const newMerchant = async (accountData) => {
    try {
        const { email, businessName, publicKey, privateKey, address } = accountData;
        const { data, error } = await supabase.from("accounts").insert(
            { email, businessName, publicKey, privateKey, address }
        );
        if (error) throw new Error(error.message);
        return { status: "success" };
    } catch (error) {
        throw new Error(error);
    }
}

const getUserAccount = async (email) => {
    try {
        const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("email", email);
        if (error) throw new Error(error.message);
        console.log(data);
        return data[0];
    } catch (error) {
        throw new Error(error);
    }
}

const updateMerchanBalance = async (email, amount) => {
    try {
        const account = await getUserAccount(email);
        const newBalance = account.balance - amount;
        const { data, error } = await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("email", email);
        if (error) throw new Error(error.message);
        return { status: "success", newBalance };
    } catch (error) {
        throw new Error(error);
    }
}

const payment = async (email, amount) => {
    try {
        const account = await getUserAccount(email);
        const newBalance = account.balance + amount;
        const { data, error } = await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("email", email);
        if (error) throw new Error(error.message);
        return { status: "success", newBalance };
    } catch (error) {
        throw new Error(error);
    }
}

module.exports = { newMerchant, getUserAccount, updateMerchanBalance, payment };