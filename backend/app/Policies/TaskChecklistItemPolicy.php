<?php

namespace App\Policies;

/** A company works only with its own TaskChecklistItem records (CompanyOwnedPolicy). */
class TaskChecklistItemPolicy extends CompanyOwnedPolicy {}
