use anchor_lang::prelude::*;

declare_id!("EWbzbZCDrQ8NmUhj8ygqF2WzCsJLksV8dXt9veUEHbAf");

#[program]
pub mod payment_splitter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, total_amount: u64) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        escrow_account.sender = *ctx.accounts.sender.key;
        escrow_account.total_amount = total_amount;
        Ok(())
    }

    pub fn add_recipients(ctx: Context<AddRecipients>, recipients: Vec<(Pubkey, u64)>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
    
        // Check if adding these recipients would exceed the limit
        if escrow_account.recipients.len() + recipients.len() > 10 {
            return Err(ErrorCode::TooManyRecipients.into());
        }
    
        // Add each recipient and their amount
        for (recipient, amount) in recipients {
            escrow_account.recipients.push(Recipient { recipient, amount });
        }
        Ok(())
    }
    

    pub fn approve(ctx: Context<Approve>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        let sender = &ctx.accounts.sender;
    
        // Check that the sender is the escrow account's sender
        if escrow_account.sender != *sender.key {
            return Err(ErrorCode::Unauthorized.into());
        }
    
        // let total_amount = escrow_account.total_amount;
    
        // Ensure there's enough SOL to distribute
        // let balance = ctx.accounts.escrow_account.to_account_info().lamports();
        // if *balance < total_amount { 
        //     return Err(ErrorCode::InsufficientFunds.into());
        // }
    
        // Distribute the SOL to each recipient
        for recipient in &escrow_account.recipients {
            let recipient_account_info = ctx.remaining_accounts
                .iter()
                .find(|account_info| account_info.key == &recipient.recipient)
                .ok_or(ErrorCode::RecipientNotFound)?;
            
            // Transfer the SOL
            **escrow_account.to_account_info().try_borrow_mut_lamports()? -= recipient.amount;
            **recipient_account_info.try_borrow_mut_lamports()? += recipient.amount;
        }
    
        Ok(())
    }
    
}


#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = sender, space = 8 + 32 + 8 + 10 * 40)] // Escrow Account size: 8 for discriminator, 32 for sender, 8 for total amount, 10 * 40 for recipients
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddRecipients<'info> {
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
}


#[derive(Accounts)]
pub struct Approve<'info> {
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
}

#[account]
pub struct EscrowAccount {
    pub sender: Pubkey,
    pub total_amount: u64,
    pub recipients: Vec<Recipient>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Recipient {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Too many recipients.")]
    TooManyRecipients,
    #[msg("Unauthorized action.")]
    Unauthorized,
    #[msg("Insufficient funds in escrow.")]
    InsufficientFunds,
    #[msg("Recipient not found.")]
    RecipientNotFound,
}
