use anchor_lang::prelude::*;

declare_id!("3VUAmbhTKjakn6Ei5etWfKExXtPCgTfYFDiF6doy1GFr");


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Recipient {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[program]
pub mod payment_splitter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, total_amount: u64) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
    
        // Set the sender and total_amount
        escrow_account.sender = *ctx.accounts.sender.key;
        escrow_account.total_amount = total_amount;
    
        // Transfer lamports to the escrow account
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.sender.key(),
            &ctx.accounts.escrow_account.key(),
            total_amount, // Transfer the total amount
        );
    
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.sender.to_account_info(),
                ctx.accounts.escrow_account.to_account_info(),
            ],
        )?;
    
        Ok(())
    }
    

    pub fn approve(ctx: Context<Approve>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        let sender = &ctx.accounts.sender;
    
        // Check that the sender is the escrow account's sender
        if escrow_account.sender != *sender.key {
            return Err(ErrorCode::Unauthorized.into());
        }
    
        // Check initial total amount in escrow
        msg!("Initial Escrow Account Total Amount: {:?}", escrow_account.total_amount);
    
        // Calculate total amount that needs to be transferred
        let mut total_disbursement = 0;
    
        for recipient in &escrow_account.recipients {
            let recipient_amount = recipient.amount;
    
            // Ensure we do not exceed the total amount available
            if escrow_account.total_amount < recipient_amount {
                return Err(ErrorCode::InsufficientFunds.into());
            }
    
            // Accumulate total disbursement
            total_disbursement += recipient_amount;
    
            // Log each recipient amount for debugging
            msg!("Recipient: {:?}, Amount: {:?}", recipient.recipient, recipient_amount);
        }
    
        // Log the total disbursement amount
        msg!("Total Disbursement Amount: {:?}", total_disbursement);
    
        // Ensure no underflow occurs before mutably borrowing
        escrow_account.total_amount = escrow_account
            .total_amount
            .checked_sub(total_disbursement)
            .ok_or(ErrorCode::InsufficientFunds)?;
    
        // Log new total amount after disbursement
        msg!("New Escrow Total Amount after disbursement: {:?}", escrow_account.total_amount);
    
        // Now perform the transfer to each recipient
        for recipient in &escrow_account.recipients {
            msg!("Looking for recipient: {:?}", recipient.recipient);
            let recipient_account_info = ctx.remaining_accounts
                .iter()
                .find(|account_info| {
                    println!("Checking account: {:?}", account_info.key);
                    account_info.key == &recipient.recipient
                })
                .ok_or(ErrorCode::RecipientNotFound)?;
    
            // Transfer lamports
            let escrow_balance = escrow_account.to_account_info().lamports();
            let new_escrow_balance = escrow_balance.checked_sub(recipient.amount)
                .ok_or(ErrorCode::InsufficientFunds)?; // Handle underflow here
    
            // Set the new escrow balance
            **escrow_account.to_account_info().try_borrow_mut_lamports()? = new_escrow_balance;
    
            // Update recipient balance
            let recipient_balance = recipient_account_info.lamports();
            let new_recipient_balance = recipient_balance.checked_add(recipient.amount)
                .ok_or(ErrorCode::Overflow)?; // Handle overflow here
    
            // Set the new recipient balance
            **recipient_account_info.try_borrow_mut_lamports()? = new_recipient_balance;
    
            // Log the balances for debugging
            msg!("Escrow Account Balance after transfer: {:?}", new_escrow_balance);
            msg!("Recipient Account Balance after transfer: {:?}", new_recipient_balance);
        }
    
        Ok(())
    }
    
    

    pub fn delete(ctx: Context<Delete>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        let sender = &ctx.accounts.sender;
    
        // Check that the sender is the escrow account's sender
        if escrow_account.sender != *sender.key {
            return Err(ErrorCode::Unauthorized.into());
        }
    
    
        let escrow_lamports = **escrow_account.to_account_info().lamports.borrow();
        let sender_lamports = **sender.to_account_info().lamports.borrow();
        **sender.to_account_info().lamports.borrow_mut() = sender_lamports.checked_add(escrow_lamports).ok_or(ErrorCode::InsufficientFunds)?;
        **escrow_account.to_account_info().lamports.borrow_mut() = 0;
    
        Ok(())
    }


    pub fn add_recipients(ctx: Context<AddRecipients>, recipients: Vec<Recipient>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;

        // Check if adding these recipients would exceed the limit
        if escrow_account.recipients.len() + recipients.len() > 10 {
            return Err(ErrorCode::TooManyRecipients.into());
        }

        // Add each recipient and their amount
        for recipient in recipients {
            escrow_account.recipients.push(recipient);
        }
        Ok(())
    }
    
}


#[derive(Accounts)]
pub struct AddRecipients<'info> {
    #[account(mut, seeds = [b"escrow", sender.key().as_ref()], bump)] // Use the same seed to find the PDA
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + 32 + 8 + 10 * 40, // Adjust the space as necessary
        seeds = [b"escrow", sender.key().as_ref()], // PDA seed
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    pub system_program: Program<'info, System>,
}




#[derive(Accounts)]
pub struct Approve<'info> {
    #[account(mut, seeds = [b"escrow", sender.key().as_ref()], bump)] // Use the same seed to find the PDA
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
}

#[derive(Accounts)]
pub struct Delete<'info> {
    #[account(mut, seeds = [b"escrow", sender.key().as_ref()], bump, close = sender)] // Close the account and send remaining lamports to the sender
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
    #[msg("Overflow has occured.")]
    Overflow,
}
